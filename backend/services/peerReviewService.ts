import PeerReviewModel from '@models/PeerReview';
import CourseModel from '@models/Course';
import { NotFoundError } from './errors';
import mongoose, { Types } from 'mongoose';
import PeerReviewAssignmentModel from '@models/PeerReviewAssignment';
import PeerReviewCommentModel from '@models/PeerReviewComment';
import {
  PeerReviewTeamMemberDTO,
  PeerReviewInfoDTO,
  PeerReviewAssignment,
  TAToAssignmentsMap,
} from '@shared/types/PeerReview';
import {
  initialiseAssignments,
  deleteAssignmentsByPeerReviewId,
} from './peerReviewAssignmentService';
import { COURSE_ROLE } from '@shared/types/auth/CourseRole';
import UserModel, { User } from '@models/User';
import TeamModel from '@models/Team';
import TeamDataModel, { TeamData } from '@models/TeamData';

export interface NormalizedTeam {
  id: string;
  number: number;
  memberIds: string[];
  taId: string | null;
}

const oid = (s: string) => new Types.ObjectId(s);

export const getAllPeerReviewsyId = async (courseId: string) => {
  const peerReviews = await PeerReviewModel.find({ course: courseId });
  if (!peerReviews)
    throw new NotFoundError('No peer reviews found for this course');

  const result = peerReviews.map(r => {
    const obj = r.toObject();
    obj.status = obj.computedStatus ?? obj.status; // override with computed status
    return obj;
  });
  return result;
};

export const getPeerReviewById = async (peerReviewId: string) => {
  const peerReview = await PeerReviewModel.findById(peerReviewId);
  if (!peerReview) throw new NotFoundError('Peer review not found');
  return peerReview;
};

// Get peer review info by ID, scoped to the user's role and permissions
export const getPeerReviewInfoById = async (
  userId: string,
  userCourseRole: string,
  courseId: string,
  peerReviewId: string
): Promise<PeerReviewInfoDTO> => {
  const peerReview = await getPeerReviewById(peerReviewId);
  const reviewerType = peerReview.reviewerType;
  const taAssignmentsEnabled = peerReview.TaAssignments;
  const teamSetId = peerReview.teamSetId.toString();

  const { teamIds, filterByTA } = await getScopedTeamIds(
    userId,
    userCourseRole,
    teamSetId
  );
  const scopedTeams = await getScopedTeams(teamSetId, teamIds, filterByTA);
  if (scopedTeams.length === 0)
    return emptyPeerReviewInfo(peerReviewId, reviewerType);

  const prTeamIds = scopedTeams.map(t => t.id);
  const teamDataById = await getTeamDataById(
    courseId,
    scopedTeams.map(t => t.number)
  );
  const usersById = await getUsersByIdForTeams(scopedTeams);

  const prAssignments = await getAssignmentsForTeams(
    peerReviewId,
    reviewerType,
    scopedTeams,
    taAssignmentsEnabled
  );

  const { memberAssignmentsByUserId, teamAssignmentsByTeamId } =
    buildAssignmentMaps(reviewerType, scopedTeams, prAssignments);

  const assignmentsOfTeam = buildTeamToReviewersMap(prAssignments);
  const assignmentsForTAs = buildTAToAssignmentsMap(
    taAssignmentsEnabled,
    userCourseRole,
    userId,
    usersById,
    scopedTeams,
    prAssignments
  );

  const teams = buildTeamDTOs(
    reviewerType,
    scopedTeams,
    teamDataById,
    usersById,
    memberAssignmentsByUserId,
    teamAssignmentsByTeamId
  );

  return {
    _id: peerReviewId,
    reviewerType,
    teams,
    assignmentsOfTeam,
    TAAssignments: assignmentsForTAs,
    capabilities: { assignmentPageTeamIds: prTeamIds },
  };
};

export const createPeerReviewById = async (
  courseId: string,
  userId: string,
  peerReviewData: {
    assessmentName: string;
    description: string;
    startDate: Date;
    endDate: Date;
    teamSetId: string;
    reviewerType: 'Individual' | 'Team';
    TaAssignments: boolean;
    minReviews: number;
    maxReviews: number;
  }
) => {
  const course = await CourseModel.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }

  const {
    assessmentName: title,
    description,
    startDate,
    endDate,
    teamSetId,
    reviewerType,
    TaAssignments,
    minReviews: minReviewsPerReviewer,
    maxReviews: maxReviewsPerReviewer,
  } = peerReviewData;

  // Basic validation
  const newPeerReview = new PeerReviewModel({
    course: course._id,
    createdAt: Date.now(),
    title,
    description,
    startDate,
    endDate,
    teamSetId,
    TaAssignments,
    reviewerType,
    minReviewsPerReviewer,
    maxReviewsPerReviewer,
  });
  await newPeerReview.save();

  // Initialise assignments
  await initialiseAssignments(
    courseId,
    newPeerReview._id.toString(),
    teamSetId,
    userId
  );

  return newPeerReview;
};

export const deletePeerReviewById = async (peerReviewId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const peerReview = await PeerReviewModel.findById(peerReviewId);
    if (!peerReview) throw new NotFoundError('Peer review not found');

    const prAssignments: PeerReviewAssignment[] =
      await PeerReviewAssignmentModel.find({
        peerReviewId,
      });
    const assignmentIds = prAssignments.map(assignment => assignment._id);

    // Delete associated comments
    const delCommentsRes = await PeerReviewCommentModel.deleteMany({
      peerReviewAssignmentId: { $in: assignmentIds },
    });

    // Delete peer review assignments
    const delAssignmentsRes =
      await deleteAssignmentsByPeerReviewId(peerReviewId);

    const delPeerReviewRes =
      await PeerReviewModel.findByIdAndDelete(peerReviewId);
    if (!delPeerReviewRes)
      throw new NotFoundError('Peer review not found for deletion');

    await session.commitTransaction();
    session.endSession();

    return {
      deletedPeerReviewId: peerReviewId,
      deletedPeerReviewTitle: peerReview.title,
      deleted: {
        comments: delCommentsRes.deletedCount || 0,
        assignments: delAssignmentsRes.deletedCount || 0,
        peerReview: delPeerReviewRes ? 1 : 0,
      },
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const updatePeerReviewById = async (
  peerReviewId: string,
  userId: string,
  settingsData: any
) => {
  const {
    assessmentName: title,
    description,
    startDate,
    endDate,
    teamSetId,
    reviewerType,
    TaAssignments,
    minReviews: minReviewsPerReviewer,
    maxReviews: maxReviewsPerReviewer,
  } = settingsData;

  const updatedPeerReviewData = {
    ...(title && { title }),
    ...(description && { description }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(teamSetId && { teamSetId }),
    ...(reviewerType && { reviewerType }),
    ...(TaAssignments !== undefined && { TaAssignments }),
    ...(minReviewsPerReviewer !== undefined && { minReviewsPerReviewer }),
    ...(maxReviewsPerReviewer !== undefined && { maxReviewsPerReviewer }),
  };

  // Update Peer Review
  const updatedPeerReview = await PeerReviewModel.findByIdAndUpdate(
    peerReviewId,
    updatedPeerReviewData,
    { new: true }
  );
  if (!updatedPeerReview) throw new NotFoundError('Peer review not found');

  // Delete existing assignments and re-initialize
  await deleteAssignmentsByPeerReviewId(peerReviewId);
  if (teamSetId) {
    await initialiseAssignments(
      updatedPeerReview.course.toString(),
      peerReviewId,
      teamSetId,
      userId
    );
  }

  return updatedPeerReview;
};

/* ----- Sub Functions for GetPeerReviewInfo ----- */
const emptyPeerReviewInfo = (
  peerReviewId: string,
  reviewerType: 'Individual' | 'Team'
) => {
  return {
    _id: peerReviewId,
    teams: [],
    reviewerType: reviewerType,
    assignmentsOfTeam: {},
    TAAssignments: {},
    capabilities: { assignmentPageTeamIds: [] },
  };
};

const getScopedTeamIds = async (
  userId: string,
  userCourseRole: string,
  teamSetId: string
) => {
  if (userCourseRole === COURSE_ROLE.Student) {
    const myTeam = await TeamModel.findOne({
      teamSet: teamSetId,
      members: userId,
    })
      .select('_id')
      .lean();
    if (!myTeam) return { teamIds: [] };
    return { teamIds: [myTeam._id.toString()] };
  }

  if (userCourseRole === COURSE_ROLE.TA) {
    return { teamIds: [], filterByTA: userId };
  }

  return { teamIds: [] };
};

const getScopedTeams = async (
  teamSetId: string,
  teamIds: string[],
  filterByTA?: string
): Promise<NormalizedTeam[]> => {
  const teamQuery: any = { teamSet: teamSetId };
  if (teamIds.length > 0) {
    teamQuery._id = { $in: teamIds };
  }
  if (filterByTA) {
    teamQuery.TA = filterByTA;
  }

  const prTeams = await TeamModel.find(teamQuery)
    .select('_id number members TA')
    .lean();

  if (prTeams.length === 0) return [];
  return prTeams.map(t => ({
    id: t._id.toString(),
    number: t.number,
    taId: t.TA ? t.TA.toString() : null,
    memberIds: t.members ? t.members.map(m => m.toString()) : [],
  }));
};

export const getTeamDataById = async (
  courseId: string,
  teamNumbers: number[]
) => {
  const prTeamDatas: TeamData[] = await TeamDataModel.find({
    course: courseId,
    teamId: { $in: teamNumbers },
  })
    .select('teamId gitHubOrgName repoName')
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

  // DUMMY DATA FOR TESTING
  teamDataById.set('1', {
    gitHubOrgName: 'gongg21',
    repoName: 'AddSubtract',
    repoUrl: 'https://github.com/gongg21/AddSubtract.git',
  });

  return teamDataById;
};

const getUsersByIdForTeams = async (scopedTeams: NormalizedTeam[]) => {
  const userIds = new Set<string>();
  for (const team of scopedTeams) {
    if (team.taId) userIds.add(team.taId.toString());
    team.memberIds.forEach(mid => userIds.add(mid));
  }

  if (userIds.size === 0) return new Map<string, string>();
  const users: User[] = await UserModel.find({ _id: { $in: [...userIds] } })
    .select('_id name')
    .lean();
  return new Map(users.map(u => [u._id.toString(), u.name]));
};

const getAssignmentsForTeams = async (
  peerReviewId: string,
  reviewerType: 'Individual' | 'Team',
  scopedTeams: NormalizedTeam[],
  taAssignmentsEnabled: boolean
): Promise<PeerReviewAssignment[]> => {
  const prTeamIds = scopedTeams.map(t => t.id);
  const baseFilter = { peerReviewId: oid(peerReviewId) };
  if (reviewerType === 'Individual') {
    const allMemberIds = scopedTeams.flatMap(t => t.memberIds);
    const allTaIds = scopedTeams.map(t => t.taId).filter(Boolean) as string[];

    const orConditions = [
      {
        studentReviewers: {
          $in: allMemberIds.map(id => oid(id)),
        },
      },
      { reviewee: { $in: prTeamIds.map(id => oid(id)) } },
      ...(taAssignmentsEnabled
        ? [{ taReviewers: { $in: allTaIds.map(id => oid(id)) } }]
        : []),
    ];

    return await PeerReviewAssignmentModel.find({
      ...baseFilter,
      $or: orConditions,
    })
      .populate([
        {
          path: 'reviewee',
          select: 'number TA',
          populate: {
            path: 'TA',
            select: 'name',
          },
        },
        { path: 'studentReviewers', select: 'name' },
        { path: 'taReviewers', select: '_id name' },
      ])
      .lean();
  }

  const prAssignments: PeerReviewAssignment[] =
    await PeerReviewAssignmentModel.find({
      peerReviewId,
      $or: [
        { teamReviewers: { $in: prTeamIds.map(id => oid(id)) } },
        { reviewee: { $in: prTeamIds.map(id => oid(id)) } },
      ],
    })
      .populate([
        {
          path: 'reviewee',
          select: 'number TA',
          populate: {
            path: 'TA',
            select: 'name',
          },
        },
        { path: 'teamReviewers', select: 'number' },
        { path: 'taReviewers', select: 'name' },
      ])
      .lean();

  console.log('Fetched Peer Review Assignments:', prAssignments);
  return prAssignments;
};

const buildAssignmentMaps = (
  reviewerType: 'Individual' | 'Team',
  scopedTeams: NormalizedTeam[],
  prAssignments: PeerReviewAssignment[]
) => {
  const memberAssignmentsByUserId = new Map<string, PeerReviewAssignment[]>();
  const teamAssignmentsByTeamId = new Map<string, PeerReviewAssignment[]>();

  if (reviewerType === 'Individual') {
    const memberSet = new Set(scopedTeams.flatMap(t => t.memberIds));
    for (const a of prAssignments) {
      const userReviewerIds = a.studentReviewers.map(u => u._id.toString());
      for (const reviewerId of userReviewerIds) {
        if (!memberSet.has(reviewerId)) continue;
        const val = memberAssignmentsByUserId.get(reviewerId) ?? [];
        val.push(a);
        memberAssignmentsByUserId.set(reviewerId, val);
      }
    }
  } else {
    const teamSet = new Set(scopedTeams.map(t => t.id));
    for (const a of prAssignments) {
      const teamReviewerIds = a.teamReviewers.map(t => t._id.toString());
      for (const reviewerId of teamReviewerIds) {
        if (!teamSet.has(reviewerId)) continue;
        const val = teamAssignmentsByTeamId.get(reviewerId) ?? [];
        val.push(a);
        teamAssignmentsByTeamId.set(reviewerId, val);
      }
    }
  }
  return { memberAssignmentsByUserId, teamAssignmentsByTeamId };
};

const buildTeamToReviewersMap = (prAssignments: PeerReviewAssignment[]) => {
  console.log('Building assignmentsOfTeam map...');
  const assignmentsOfTeam: Record<string, PeerReviewAssignment> = {};
  for (const a of prAssignments) {
    assignmentsOfTeam[a.reviewee._id] = a;
  }
  return assignmentsOfTeam;
};

const buildTAToAssignmentsMap = (
  taAssignmentsEnabled: boolean,
  userCourseRole: string,
  userId: string,
  usersById: Map<string, string>,
  scopedTeams: NormalizedTeam[],
  prAssignments: PeerReviewAssignment[]
): TAToAssignmentsMap => {
  if (!taAssignmentsEnabled) return {};
  const taIdsWanted =
    userCourseRole === COURSE_ROLE.Faculty
      ? (scopedTeams.map(t => t.taId).filter(Boolean) as string[])
      : userCourseRole === COURSE_ROLE.TA
        ? [userId]
        : [];

  console.log('TA IDs wanted for TAToAssignmentsMap:', taIdsWanted);
  if (taIdsWanted.length === 0) return {};

  const assignmentsForTAs: TAToAssignmentsMap = {};
  for (const taId of taIdsWanted) {
    assignmentsForTAs[taId] = {
      taName: usersById.get(taId) ?? 'Unknown',
      assignedReviews: [],
    };
  }

  const taIdsWantedSet = new Set(taIdsWanted);
  console.log('Building TAToAssignmentsMap for TAs:', taIdsWantedSet);

  for (const a of prAssignments) {
    for (const reviewer of a.taReviewers) {
      console.log('Checking TA reviewer:', reviewer._id);
      console.log('TA is in wanted set:', taIdsWantedSet.has(reviewer._id));
      if (taIdsWantedSet.has(reviewer._id.toString())) {
        const val = assignmentsForTAs[reviewer._id];
        console.log('current val for TA', reviewer._id, ':', val);
        val.assignedReviews.push(a);
        assignmentsForTAs[reviewer._id.toString()] = val;
        console.log(
          `Added assignment for TA ${reviewer._id} on reviewee team ${a.reviewee.number}`
        );
        console.log('Current assignments:', val.assignedReviews);
      }
    }
  }

  console.log('Built TAToAssignmentsMap:', assignmentsForTAs);
  return assignmentsForTAs;
};

const buildTeamDTOs = (
  reviewerType: 'Individual' | 'Team',
  scopedTeams: NormalizedTeam[],
  teamDataById: Map<
    string,
    { repoUrl: string; repoName: string; gitHubOrgName: string }
  >,
  usersById: Map<string, string>,
  memberAssignmentsByUserId: Map<string, PeerReviewAssignment[]>,
  teamAssignmentsByTeamId: Map<string, PeerReviewAssignment[]>
) => {
  return scopedTeams.map(team => {
    const teamData = teamDataById.get(team.number.toString());
    const taName = team.taId ? usersById.get(team.taId) ?? '' : '';

    const members: PeerReviewTeamMemberDTO[] = team.memberIds.map(memberId => ({
      userId: memberId,
      name: usersById.get(memberId) ?? 'Unknown',
      assignedReviews: memberAssignmentsByUserId.get(memberId) || [],
    }));

    const assignedReviewsToTeam =
      reviewerType === 'Team' ? teamAssignmentsByTeamId.get(team.id) || [] : [];

    return {
      teamId: team.id,
      teamNumber: team.number,
      repoUrl: teamData ? teamData.repoUrl : '',
      repoName: teamData ? teamData.repoName : '',
      TA: { id: team.taId ?? '', name: taName },
      members,
      assignedReviewsToTeam,
    };
  });
};
