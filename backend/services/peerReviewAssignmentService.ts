import PeerReviewModel, { PeerReview } from '@models/PeerReview';
import PeerReviewSettingsModel from '@models/PeerReviewSettings';
import PeerReviewAssignmentModel from '@models/PeerReviewAssignment';
import TeamModel from '@models/Team';
import UserModel from '@models/User';
import {
  PeerReviewAssignment,
  TAToAssignmentsMap,
  TeamToReviewersMap,
} from '@shared/types/PeerReview';
import {
  BadRequestError,
  NotFoundError,
  MissingAuthorizationError,
} from './errors';
import CourseRole from '@shared/types/auth/CourseRole';
import {
  PeerReviewTeamMemberDTO,
  PeerReviewTeamDTO,
  PeerReviewInfoDTO,
} from '@shared/types/PeerReview';
import TeamSetModel from '@models/TeamSet';
import TeamDataModel from '@models/TeamData';
import { Types } from 'mongoose';

export const getPeerReviewInfoById = async (
  userId: string,
  userCourseRole: string,
  peerReviewId: string,
  includeReviewersForTeams: boolean = false
): Promise<PeerReviewInfoDTO> => {
  const peerReview = await PeerReviewModel.findById(peerReviewId);
  if (!peerReview) {
    throw new NotFoundError('Peer review not found');
  }

  const peerReviewSettings = await PeerReviewSettingsModel.findOne({
    peerReviewId,
  });
  if (!peerReviewSettings) {
    throw new NotFoundError('Peer review settings not found');
  }

  const reviewerType = peerReviewSettings.reviewerType;
  const taAssignmentsEnabled = peerReviewSettings.TaAssignments;
  const teamSetId = peerReview.teamSetId;

  // Prepare teams query based on user role
  const teamQuery = {
    _id: null as string | null,
    teamSetId,
    taId: null as string | null,
  };
  if (userCourseRole === CourseRole.Student) {
    const myTeam = await TeamModel.findOne({
      ...teamQuery,
      members: userId,
    })
      .select('_id')
      .lean();
    if (!myTeam) emptyPeerReviewDto(peerReviewId);
    teamQuery._id = myTeam!._id.toString();
  } else if (userCourseRole === CourseRole.TA) {
    teamQuery.taId = userId;
  }

  // Get teams in the peer review's team set
  const prTeams = await TeamModel.find(teamQuery)
    .select('_id number members TA')
    .lean();
  if (prTeams.length === 0) return emptyPeerReviewDto(peerReviewId);

  const prTeamIds = prTeams.map(t => t._id.toString());
  const scopedTeams = prTeams.map(t => ({
    id: t._id.toString(),
    number: t.number,
    taId: t.TA ? t.TA.toString() : null,
    memberIds: t.members ? t.members.map(m => m.toString()) : [],
  }));

  // TODO: Derive repo URL for these teams, for now fix example
  const prTeamDatas = await TeamDataModel.find({ teamId: { $in: prTeamIds } })
    .select('gitHubOrgName repoName')
    .lean();
  const teamDataById = new Map(
    prTeamDatas.map(td => [
      td.teamId.toString(),
      {
        gitHubOrgName: td.gitHubOrgName || '',
        repoName: td.repoName || '',
        repoUrl: 'https://github.com/gongg21/AddSubtract.git',
      },
    ])
  );

  // Prepare to get user data for all involved users
  const userIds = new Set<string>();
  for (const team of scopedTeams) {
    if (team.taId) userIds.add(team.taId.toString());
    (team.memberIds ?? []).forEach(m => userIds.add(m.toString()));
  }

  const users =
    userIds.size > 0
      ? await UserModel.find({ _id: { $in: [...userIds] } })
          .select('_id name')
          .lean()
      : [];
  const usersById = new Map(
    users.map(u => [
      u._id.toString(),
      {
        id: u._id.toString(),
        name: u.name,
      },
    ])
  );

  // Retrieve peer review assignments
  let prAssignments: PeerReviewAssignment[] = [];
  if (reviewerType === 'Individual') {
    // Retrieve assignments assigned to individual reviewers
    // + retrieve assignments to teams where user is a member (only if includeReviewersForTeams is true)
    const allMemberIds = scopedTeams.flatMap(t => t.memberIds);
    const allTaIds = scopedTeams
      .map(t => t.taId)
      .filter((id): id is string => id !== null);
    prAssignments = await PeerReviewAssignmentModel.find({
      peerReviewId,
      $or: [
        {
          reviewerUser: { $in: allMemberIds.map(id => new Types.ObjectId(id)) },
        },
        { reviewee: { $in: prTeamIds.map(id => new Types.ObjectId(id)) } },
        ...(taAssignmentsEnabled
          ? [
              {
                reviewerUser: {
                  $in: allTaIds.map(id => new Types.ObjectId(id)),
                },
              },
            ]
          : []),
      ],
    }).lean();
  } else {
    // Retrieve assignments assigned to teams
    // + retrieve assignments to teams where user is a member (only if includeReviewersForTeams is true)
    prAssignments = await PeerReviewAssignmentModel.find({
      peerReviewId,
      $or: [
        { reviewerTeam: { $in: prTeamIds.map(id => new Types.ObjectId(id)) } },
        { reviewee: { $in: prTeamIds.map(id => new Types.ObjectId(id)) } },
      ],
    }).lean();
  }

  if (
    reviewerType === 'Individual' &&
    (includeReviewersForTeams || taAssignmentsEnabled)
  ) {
    prAssignments.forEach(a => {
      if (a.reviewerUser) userIds.add(a.reviewerUser._id);
    });
  }

  // Build assignment maps
  const memberAssignmentsByUserId = new Map<string, PeerReviewAssignment[]>();
  const teamAssignmentsByTeamId = new Map<string, PeerReviewAssignment[]>();

  if (reviewerType === 'Individual') {
    const memberIds = new Set(scopedTeams.flatMap(t => t.memberIds));
    for (const a of prAssignments) {
      if (a.reviewerUser && memberIds.has(a.reviewerUser._id)) {
        const key = a.reviewerUser._id;
        const val = memberAssignmentsByUserId.get(key) || [];
        val.push(a);
        memberAssignmentsByUserId.set(a.reviewerUser._id, val);
      }
    }
  } else {
    const reviewerTeamIds = new Set(prTeamIds);
    for (const a of prAssignments) {
      if (a.reviewerTeam && reviewerTeamIds.has(a.reviewerTeam._id)) {
        const key = a.reviewerTeam._id;
        const val = teamAssignmentsByTeamId.get(key) || [];
        val.push(a);
        teamAssignmentsByTeamId.set(a.reviewerTeam._id, val);
      }
    }
  }

  // Build ReviewersToTeams map if requested
  let reviewersForTeams: TeamToReviewersMap | undefined;
  if (
    includeReviewersForTeams &&
    (userCourseRole === CourseRole.Faculty || userCourseRole === CourseRole.TA)
  ) {
    reviewersForTeams = {};
    for (const a of prAssignments) {
      const reviewee = a.reviewee;
      if (!reviewee || !prTeamIds.includes(reviewee._id)) continue;
      const val = reviewersForTeams[reviewee._id] || [];
      if (reviewerType === 'Individual' && a.reviewerUser) {
        val.push({
          kind: 'User',
          userId: a.reviewerUser._id,
          name: usersById.get(a.reviewerUser._id)?.name || 'Unknown',
        });
      } else if (reviewerType === 'Team' && a.reviewerTeam) {
        const team = scopedTeams.find(t => t.id === a.reviewerTeam!._id);
        if (team)
          val.push({
            kind: 'Team',
            teamId: team.id,
            teamNumber: team.number,
          });
      }
      reviewersForTeams[reviewee._id] = val;
    }
  }

  // Build TAToAssignments map if TA assignments enabled
  let assignmentsForTAs: TAToAssignmentsMap | undefined;
  if (taAssignmentsEnabled) {
    const taIdsWanted =
      userCourseRole === CourseRole.Faculty
        ? scopedTeams.map(t => t.taId).filter((id): id is string => id !== null)
        : userCourseRole === CourseRole.TA
          ? [userId]
          : [];

    if (taIdsWanted.length > 0) {
      assignmentsForTAs = {};
      for (const taId of taIdsWanted) {
        const taAssignments = prAssignments.filter(
          a => a.reviewerUser?._id === taId
        );
        if (taAssignments.length > 0) {
          assignmentsForTAs[taId] = {
            taName: usersById.get(taId)?.name || 'Unknown',
            assignedReviews: taAssignments,
          };
        }
      }
    }
  }

  // Build Response DTO
  const teams: PeerReviewTeamDTO[] = scopedTeams.map(team => {
    const teamData = teamDataById.get(team.id);
    const TA = team.taId ? usersById.get(team.taId)?.name || '' : '';
    const members = team.memberIds.map(
      (memberId): PeerReviewTeamMemberDTO => ({
        userId: memberId,
        name: usersById.get(memberId)?.name || 'Unknown',
        assignedReviews: memberAssignmentsByUserId.get(memberId) || [],
      })
    );

    const assignedReviewsToTeam =
      reviewerType === 'Team' ? teamAssignmentsByTeamId.get(team.id) || [] : [];

    return {
      teamId: team.id,
      teamNumber: team.number,
      repoUrl: teamData ? teamData.repoUrl : '',
      repoName: teamData ? teamData.repoName : '',
      TA,
      members,
      assignedReviewsToTeam,
    };
  });

  const assignmentPageTeamIds = prTeamIds;
  return {
    _id: peerReviewId,
    teams,
    ...(reviewersForTeams ? { reviewersForTeams } : {}),
    ...(assignmentsForTAs ? { assignmentsForTAs } : {}),
    capabilities: { assignmentPageTeamIds },
  };
};

function emptyPeerReviewDto(peerReviewId: string): PeerReviewInfoDTO {
  return {
    _id: peerReviewId,
    teams: [],
    capabilities: { assignmentPageTeamIds: [] },
  };
}

export const getPeerReviewAssignmentsByPeerReviewId = async (
  userId: string,
  userCourseRole: string,
  peerReviewId: string
) => {
  // Validate peer review exists
  const peerReview = await PeerReviewModel.findById(peerReviewId);
  if (!peerReview) {
    throw new NotFoundError('Peer review not found');
  }

  // Students can only view their own assignments
  if (userCourseRole === CourseRole.Student) {
    const studentAssignments = await PeerReviewAssignmentModel.find({
      peerReviewId,
      reviewerUser: userId,
    });
    return studentAssignments;
  }

  const allAssignments = await PeerReviewAssignmentModel.find({ peerReviewId });

  // TAs can view their own assignments (if any) and all assignments they are supervising
  if (userCourseRole === CourseRole.TA) {
    const taAssignments = allAssignments
      .filter(async a => {
        const reviewerTeam = await TeamModel.findById(a.reviewerTeam);
        if (reviewerTeam && reviewerTeam.TA!.toString() === userId) return true;
        return false;
      })
      .concat(
        allAssignments.filter(a => a.reviewerUser?.toString() === userId)
      );
    return taAssignments;
  }

  // Course coordinators can view all assignments
  return allAssignments;
};

export const getPeerReviewAssignmentsByTeamId = async (
  userCourseRole: string,
  teamId: string
) => {
  // Only course coordinators and TAs can view assignments by team
  if (
    userCourseRole !== CourseRole.Faculty &&
    userCourseRole !== CourseRole.TA
  ) {
    throw new MissingAuthorizationError(
      'Only course coordinators and TAs can view peer review assignments by team'
    );
  }

  const assignments = await PeerReviewAssignmentModel.find({
    reviewee: teamId,
  });
  if (!assignments) {
    throw new NotFoundError('No peer review assignments found for this team');
  }
  return assignments;
};

export const getPeerReviewAssignmentById = async (
  userCourseRole: string,
  userId: string,
  assignmentId: string
) => {
  const assignment = await PeerReviewAssignmentModel.findById(assignmentId);
  if (!assignment) throw new NotFoundError('Peer review assignment not found');

  // Check if user is the reviewer user
  const isReviewerUser = assignment.reviewerUser?.toString() === userId;
  if (isReviewerUser) return assignment;

  if (userCourseRole === CourseRole.Student) {
    // Check if student is part of the reviewer team
    const reviewerTeam = await TeamModel.findById(assignment.reviewerTeam);
    if (reviewerTeam && reviewerTeam.members?.map(String).includes(userId))
      return assignment;

    // Check if student is part of the reviewee team
    const revieweeTeam = await TeamModel.findById(assignment.reviewee);
    if (revieweeTeam && revieweeTeam.members?.map(String).includes(userId))
      return assignment;
  }

  if (userCourseRole === CourseRole.TA) {
    // Check if TA is supervising the reviewee team
    const revieweeTeam = await TeamModel.findById(assignment.reviewee);
    if (revieweeTeam && revieweeTeam.TA!.toString() === userId)
      return assignment;
  }

  // Course coordinators can view all assignments
  console.log(userCourseRole);
  if (userCourseRole === CourseRole.Faculty) return assignment;

  throw new MissingAuthorizationError(
    'You are not authorized to view this assignment'
  );
};

export const assignPeerReviewById = async (
  peerReviewId: string,
  assignmentData: any
) => {};

export const randomAssignPeerReviewsById = async (peerReviewId: string) => {};
