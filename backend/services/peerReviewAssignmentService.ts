import PeerReviewAssignmentModel from '@models/PeerReviewAssignment';
import TeamModel from '@models/Team';
import UserModel from '@models/User';
import {
  PeerReviewAssignment,
  TAToAssignmentsMap,
} from '@shared/types/PeerReview';
import { BadRequestError, NotFoundError } from './errors';
import CourseRole from '@shared/types/auth/CourseRole';
import {
  PeerReviewTeamMemberDTO,
  PeerReviewInfoDTO,
} from '@shared/types/PeerReview';
import TeamDataModel from '@models/TeamData';
import { Types } from 'mongoose';
import { getPeerReviewById } from './peerReviewService';
import type { AnyBulkWriteOperation } from 'mongodb';

export interface NormalizedTeam {
  id: string;
  number: number;
  memberIds: string[];
  taId: string | null;
}

const oid = (s: string) => new Types.ObjectId(s);

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

// Assign peer reviews for a given peer review ID
export const assignPeerReviews = async (
  courseId: string,
  peerReviewId: string,
  userId: string,
  reviewsPerReviewer: number,
  allowSameTA: boolean
) => {
  if (!Number.isInteger(reviewsPerReviewer) || reviewsPerReviewer <= 0) {
    throw new BadRequestError('reviewsPerReviewer must be a positive integer');
  }

  const peerReview = await getPeerReviewById(peerReviewId);
  const reviewerType = peerReview.reviewerType;
  const taAssignmentsEnabled = peerReview.TaAssignments;
  const teamSetId = peerReview.teamSetId;

  // Prepare data structures
  const {
    teams: prTeams,
    prTeamIds,
    teamIdToTeamMap,
    teamIdToTAMap,
    teamIdToRepoMap,
  } = await prepareData(courseId, teamSetId.toString());

  // Helper to get repo info for a team
  const getTeamRepo = (teamId: string) => {
    const num = teamIdToTeamMap.get(teamId)!.number;
    return (
      teamIdToRepoMap.get(num.toString()) || {
        repoUrl: '',
        repoName: '',
        gitHubOrgName: '',
      }
    );
  };

  // Build Reviewer Pools
  const {
    studentReviewers,
    studentHomeTeam,
    teamReviewers,
    taReviewers,
    taHomeTeams,
  } = buildReviewerPools(prTeams, prTeamIds, taAssignmentsEnabled);

  console.log('studentReviewers:', studentReviewers);
  console.log('teamReviewers:', teamReviewers);
  console.log('taReviewers:', taReviewers);
  console.log('studentHomeTeam:', studentHomeTeam);
  console.log('taHomeTeams:', taHomeTeams);

  // Get Eligible Reviewwes
  const {
    studentToEligibleRevieweesMap,
    teamToEligibleRevieweesMap,
    taToEligibleRevieweesMap,
  } = buildEligibleRevieweeMaps(
    reviewerType,
    studentReviewers,
    studentHomeTeam,
    teamReviewers,
    taReviewers,
    taHomeTeams,
    teamIdToTeamMap,
    teamIdToTAMap,
    prTeamIds,
    allowSameTA,
    reviewsPerReviewer,
    taAssignmentsEnabled
  );

  console.log('studentToEligibleRevieweesMap:', studentToEligibleRevieweesMap);
  console.log('teamToEligibleRevieweesMap:', teamToEligibleRevieweesMap);
  console.log('taToEligibleRevieweesMap:', taToEligibleRevieweesMap);

  // Perform assignments
  const { assignedStudentsForTeam, assignedTeamsForTeam, assignedTAsForTeam } =
    performAssignments(
      reviewerType,
      prTeamIds,
      studentReviewers,
      teamReviewers,
      taReviewers,
      studentToEligibleRevieweesMap,
      teamToEligibleRevieweesMap,
      taToEligibleRevieweesMap,
      reviewsPerReviewer,
      taAssignmentsEnabled
    );

  console.log('assignedStudentsForTeam:', assignedStudentsForTeam);
  console.log('assignedTeamsForTeam:', assignedTeamsForTeam);
  console.log('assignedTAsForTeam:', assignedTAsForTeam);
  console.log('assignments completed, updating database...');

  // Update database in one session; remove old assignments and add new ones
  await updateDBAssignments(
    peerReviewId,
    userId,
    reviewerType,
    taAssignmentsEnabled,
    prTeamIds,
    getTeamRepo,
    assignedStudentsForTeam,
    assignedTeamsForTeam,
    assignedTAsForTeam
  );
};

// Assign a particular reviewer to a particular assignment
export const addManualAssignment = async (
  courseId: string,
  peerReviewId: string,
  revieweeId: string,
  reviewerId: string,
  userId: string
) => {
  const peerReview = await getPeerReviewById(peerReviewId);
  const reviewerType = peerReview.reviewerType;
  const maxReviewsPerReviewer = peerReview.maxReviewsPerReviewer;
  const teamSetId = peerReview.teamSetId;

  const reviewee = await TeamModel.findOne({
    _id: revieweeId,
    teamSet: teamSetId,
  })
    .select('number')
    .lean();
  if (!reviewee) {
    throw new NotFoundError(
      'Reviewee team not found in the peer review team set'
    );
  }

  // Check if reviewer is eligible to review the reviewee
  await checkReviewerIsEligible(
    reviewerType,
    teamSetId.toString(),
    reviewerId,
    revieweeId
  );

  // Check if reviewer has exceeded max reviews
  await checkMaxReviewsNotExceeded(
    reviewerType,
    peerReviewId,
    reviewerId,
    maxReviewsPerReviewer
  );

  // Check if duplicate assignment
  await checkIsNotDuplicateAssignment(
    peerReviewId,
    revieweeId,
    reviewerId,
    reviewerType
  );

  // Get repo URL for the reviewee team
  const teamData = await TeamDataModel.findOne({
    course: courseId,
    teamId: reviewee.number,
  })
    .select('gitHubOrgName repoName')
    .lean();

  // TODO: Derive repo URL for this team, for now fix example in upsert function

  // Add reviewer to assignment (create new assignment if none exists)
  await upsertAssignment(
    peerReviewId,
    revieweeId,
    reviewerId,
    reviewerType,
    userId,
    teamData
  );
};

// Remove a particular reviewer from a particular assignment
export const removeManualAssignment = async (
  peerReviewId: string,
  revieweeId: string,
  reviewerId: string
) => {
  const peerReview = await getPeerReviewById(peerReviewId);
  const reviewerType = peerReview.reviewerType;

  const existingAssignment = await PeerReviewAssignmentModel.findOne({
    peerReviewId,
    reviewee: revieweeId,
    ...(reviewerType === 'Individual'
      ? { studentReviewers: reviewerId }
      : { teamReviewers: reviewerId }),
  })
    .select('_id studentReviewers teamReviewers taReviewers')
    .lean();
  if (!existingAssignment) {
    return; // Nothing to remove
  }

  const pull =
    reviewerType === 'Individual'
      ? { $pull: { studentReviewers: reviewerId } }
      : { $pull: { teamReviewers: reviewerId } };

  await PeerReviewAssignmentModel.updateOne(
    { _id: existingAssignment._id },
    pull
  );
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
  if (userCourseRole === CourseRole.Student) {
    const myTeam = await TeamModel.findOne({
      teamSet: teamSetId,
      members: userId,
    })
      .select('_id')
      .lean();
    if (!myTeam) return { teamIds: [] };
    return { teamIds: [myTeam._id.toString()] };
  }

  if (userCourseRole === CourseRole.TA) {
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

const getTeamDataById = async (courseId: string, teamNumbers: number[]) => {
  const prTeamDatas = await TeamDataModel.find({
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
  const users = await UserModel.find({ _id: { $in: [...userIds] } })
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
        { path: 'taReviewers', select: 'name' },
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
  console.log('prAssignments:', prAssignments);
  console.log('assignmentsOfTeam:', assignmentsOfTeam);
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
    userCourseRole === CourseRole.Faculty
      ? (scopedTeams.map(t => t.taId).filter(Boolean) as string[])
      : userCourseRole === CourseRole.TA
        ? [userId]
        : [];

  if (taIdsWanted.length === 0) return {};

  const assignmentsForTAs: TAToAssignmentsMap = {};
  for (const taId of taIdsWanted) {
    assignmentsForTAs[taId] = {
      taName: usersById.get(taId) ?? 'Unknown',
      assignedReviews: [],
    };
  }

  const taIdsWantedSet = new Set(taIdsWanted);

  for (const a of prAssignments) {
    for (const reviewer of a.studentReviewers) {
      if (taIdsWantedSet.has(reviewer._id)) {
        const val = assignmentsForTAs[reviewer._id];
        val.assignedReviews.push(a);
        assignmentsForTAs[reviewer._id] = val;
      }
    }
  }

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
    const TA = team.taId ? usersById.get(team.taId) ?? '' : '';

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
      TA,
      members,
      assignedReviewsToTeam,
    };
  });
};

/* ------ Sub Functions for AssignPeerReviews ------ */

const prepareData = async (courseId: string, teamSetId: string) => {
  const prTeams = await TeamModel.find({ teamSet: teamSetId })
    .select('_id number members TA')
    .lean();

  if (prTeams.length < 2) {
    throw new BadRequestError('Not enough teams to assign reviews');
  }

  const teams = prTeams.map(t => ({
    id: t._id.toString(),
    number: t.number,
    taId: t.TA ? t.TA.toString() : null,
    memberIds: t.members ? t.members.map(m => m.toString()) : [],
  }));

  // Prepare data structures
  const prTeamIds = teams.map(t => t.id);
  const prTeamNumbers = teams.map(t => t.number);
  const teamIdToTeamMap = new Map(teams.map(t => [t.id, t]));
  const teamIdToTAMap = new Map(teams.map(t => [t.id, t.taId]));

  const prTeamDatas = await TeamDataModel.find({
    course: courseId,
    teamId: { $in: prTeamNumbers },
  })
    .select('teamId gitHubOrgName repoName')
    .lean();

  const teamIdToRepoMap = new Map(
    prTeamDatas.map(td => [
      td.teamId.toString(),
      {
        gitHubOrgName: td.gitHubOrgName || '',
        repoName: td.repoName || '',
        repoUrl: 'https://github.com/gongg21/AddSubtract.git',
      },
    ])
  );

  return {
    teams,
    prTeamIds,
    teamIdToTeamMap,
    teamIdToTAMap,
    teamIdToRepoMap,
  };
};

const buildReviewerPools = (
  prTeams: NormalizedTeam[],
  prTeamIds: string[],
  taAssignmentsEnabled: boolean
) => {
  // Students Reviewers Pool
  const studentReviewers: string[] = [];
  const studentHomeTeam = new Map<string, string>(); // userId -> teamId
  for (const team of prTeams) {
    const tid = team.id;
    for (const memberId of team.memberIds ?? []) {
      const mid = memberId;
      studentReviewers.push(mid);
      studentHomeTeam.set(mid, tid);
    }
  }

  // Team Reviewers Pool
  const teamReviewers: string[] = [...prTeamIds];

  // TA Reviewers Pool (when taAssignmentsEnabled)
  const taReviewers = Array.from(
    new Set(prTeams.map(t => t.taId).filter((x): x is string => Boolean(x)))
  );
  const taHomeTeams = new Map<string, string[]>(); // taId -> teamIds
  if (taAssignmentsEnabled) {
    for (const team of prTeams) {
      const ta = team.taId;
      if (ta) {
        const val = taHomeTeams.get(ta) ?? [];
        val.push(team.id);
        taHomeTeams.set(ta, val);
      }
    }
  }

  return {
    studentReviewers,
    studentHomeTeam,
    teamReviewers,
    taReviewers,
    taHomeTeams,
  };
};

const buildEligibleRevieweeMaps = (
  reviewerType: string,
  studentReviewers: string[],
  studentHomeTeam: Map<string, string>,
  teamReviewers: string[],
  taReviewers: string[],
  taHomeTeams: Map<string, string[]>,
  teamIdToTeamMap: Map<string, NormalizedTeam>,
  teamIdToTAMap: Map<string, string | null>,
  prTeamIds: string[],
  allowSameTA: boolean,
  reviewsPerReviewer: number,
  taAssignmentsEnabled: boolean
) => {
  console.log('allowSameTA:', allowSameTA);
  console.log('reviewsPerReviewer:', reviewsPerReviewer);

  const studentToEligibleRevieweesMap = new Map<string, string[]>();
  if (reviewerType === 'Individual') {
    for (const studentId of studentReviewers) {
      const homeTeamId = studentHomeTeam.get(studentId)!;
      console.log('homeTeamId for student', studentId, ':', homeTeamId);
      const eligibleReviewees = makeEligibleReviewees(
        teamIdToTAMap,
        prTeamIds,
        allowSameTA,
        homeTeamId
      );
      console.log(
        'eligibleReviewees for student',
        studentId,
        ':',
        eligibleReviewees
      );
      if (eligibleReviewees.length < reviewsPerReviewer) {
        throw new BadRequestError(
          `Not enough eligible reviewees for students in team ${teamIdToTeamMap.get(homeTeamId)?.number}. ` +
            'Consider allowing reviews of teams with same TA or reducing the number of reviews per reviewer.'
        );
      }
      studentToEligibleRevieweesMap.set(studentId, eligibleReviewees);
    }
  }

  // Get Eligible Reviewees for Teams [cannot review own team, and (if !allowSameTA) cannot review teams with same TA]
  const teamToEligibleRevieweesMap = new Map<string, string[]>();
  if (reviewerType === 'Team') {
    for (const teamId of teamReviewers) {
      const eligibleReviewees = makeEligibleReviewees(
        teamIdToTAMap,
        prTeamIds,
        allowSameTA,
        teamId
      );
      if (eligibleReviewees.length < reviewsPerReviewer) {
        throw new BadRequestError(
          `Not enough eligible reviewees for team ${teamIdToTeamMap.get(teamId)?.number}. ` +
            'Consider allowing reviews of teams with same TA or reducing the number of reviews per reviewer.'
        );
      }
      teamToEligibleRevieweesMap.set(teamId, eligibleReviewees);
    }
  }

  // Get Eligible Reviewees for TAs [cannot review teams they supervise]
  const taToEligibleRevieweesMap = new Map<string, string[]>();
  if (taAssignmentsEnabled) {
    for (const taId of taReviewers) {
      const supervisedTeams = new Set(taHomeTeams.get(taId) ?? []);
      const eligibleReviewees = prTeamIds.filter(
        tid => !supervisedTeams.has(tid)
      ); // cannot review own team
      if (eligibleReviewees.length < reviewsPerReviewer) {
        throw new BadRequestError(
          `Not enough eligible reviewees for TAs. ` +
            'Consider reducing the number of reviews per reviewer.'
        );
      }
      taToEligibleRevieweesMap.set(taId, eligibleReviewees);
    }
  }

  return {
    studentToEligibleRevieweesMap,
    teamToEligibleRevieweesMap,
    taToEligibleRevieweesMap,
  };
};

const performAssignments = (
  reviewerType: string,
  prTeamIds: string[],
  studentReviewers: string[],
  teamReviewers: string[],
  taReviewers: string[],
  studentToEligibleRevieweesMap: Map<string, string[]>,
  teamToEligibleRevieweesMap: Map<string, string[]>,
  taToEligibleRevieweesMap: Map<string, string[]>,
  reviewsPerReviewer: number,
  taAssignmentsEnabled: boolean
) => {
  const assignedStudentsForTeam = new Map<string, Set<string>>(); // revieweeId -> set of studentReviewerIds
  const assignedTeamsForTeam = new Map<string, Set<string>>(); // revieweeId -> set of teamReviewerIds
  const assignedTAsForTeam = new Map<string, Set<string>>(); // revieweeId -> set of taReviewerIds

  for (const teamId of prTeamIds) {
    assignedStudentsForTeam.set(teamId, new Set());
    assignedTeamsForTeam.set(teamId, new Set());
    assignedTAsForTeam.set(teamId, new Set());
  }

  if (reviewerType === 'Individual') {
    randomAndEqualAssign(
      studentReviewers,
      reviewsPerReviewer,
      studentToEligibleRevieweesMap,
      assignedStudentsForTeam,
      'student'
    );
  } else {
    randomAndEqualAssign(
      teamReviewers,
      reviewsPerReviewer,
      teamToEligibleRevieweesMap,
      assignedTeamsForTeam,
      'team'
    );
  }

  if (taAssignmentsEnabled && taReviewers.length > 0) {
    randomAndEqualAssign(
      taReviewers,
      reviewsPerReviewer,
      taToEligibleRevieweesMap,
      assignedTAsForTeam,
      'TA'
    );
  }

  return { assignedStudentsForTeam, assignedTeamsForTeam, assignedTAsForTeam };
};

const updateDBAssignments = async (
  peerReviewId: string,
  userId: string,
  reviewerType: string,
  taAssignmentsEnabled: boolean,
  prTeamIds: string[],
  getTeamRepo: (teamId: string) => {
    repoUrl: string;
    repoName: string;
    gitHubOrgName: string;
  },
  assignedStudentsForTeam: Map<string, Set<string>>,
  assignedTeamsForTeam: Map<string, Set<string>>,
  assignedTAsForTeam: Map<string, Set<string>>
) => {
  console.log('session starting, updating DB assignments...');

  const newAssignments: AnyBulkWriteOperation[] = prTeamIds.map(revieweeId => {
    const { repoUrl, repoName } = getTeamRepo(revieweeId);
    const convertToObjectId = (id: string) => new Types.ObjectId(id);

    const studentIds = Array.from(
      assignedStudentsForTeam.get(revieweeId) ?? []
    ).map(sid => convertToObjectId(sid));
    const teamIds = Array.from(assignedTeamsForTeam.get(revieweeId) ?? []).map(
      tid => convertToObjectId(tid)
    );
    const taIds = Array.from(assignedTAsForTeam.get(revieweeId) ?? []).map(
      taId => convertToObjectId(taId)
    );

    const peerReviewIdObj = convertToObjectId(peerReviewId);
    const revieweeIdObj = convertToObjectId(revieweeId);

    return {
      replaceOne: {
        filter: { peerReviewId: peerReviewIdObj, reviewee: revieweeIdObj },
        replacement: {
          peerReviewId: peerReviewIdObj,
          repoName,
          repoUrl,
          studentReviewers: reviewerType === 'Individual' ? studentIds : [],
          teamReviewers: reviewerType === 'Team' ? teamIds : [],
          taReviewers: taAssignmentsEnabled ? taIds : [],
          reviewee: revieweeIdObj,
          assignedBy: convertToObjectId(userId),
          assignedAt: new Date(),
          status: 'Pending' as const,
        },
        upsert: true,
      },
    };
  });

  await PeerReviewAssignmentModel.deleteMany({
    peerReviewId: peerReviewId,
    reviewee: { $nin: prTeamIds.map(id => oid(id)) },
  });

  if (newAssignments.length > 0) {
    await PeerReviewAssignmentModel.bulkWrite(newAssignments, {
      ordered: true,
    });
  }
};

// Shuffle array in place using Fisher-Yates algorithm
const shuffleInPlace = <T>(arr: T[]) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Get eligible reviewees for a reviewer, considering TA constraints
const makeEligibleReviewees = (
  teamIdToTAMap: Map<string, string | null>,
  prTeamIds: string[],
  allowSameTA: boolean,
  homeTeamId: string
) => {
  const homeTA = teamIdToTAMap.get(homeTeamId);
  console.log('homeTeamId:', homeTeamId, 'homeTA:', homeTA);
  console.log('prTeamIds:', prTeamIds);
  return prTeamIds.filter(tid => {
    if (tid === homeTeamId) return false; // cannot review own team
    if (!allowSameTA) {
      const targetTA = teamIdToTAMap.get(tid);
      if (homeTA && targetTA && homeTA === targetTA) return false; // cannot review teams with same TA
    }
    return true;
  });
};

// Randomly and equally assign reviewees to reviewers
const randomAndEqualAssign = (
  reviewerIds: string[],
  reviewsPerReviewer: number,
  eligibleRevieweesMap: Map<string, string[]>,
  assignedForTeamMap: Map<string, Set<string>>,
  label: 'student' | 'team' | 'TA'
) => {
  const randomisedReviewers = shuffleInPlace([...reviewerIds]);
  for (const reviewerId of randomisedReviewers) {
    const numReviewersNeeded = reviewsPerReviewer;
    const candidates = [...(eligibleRevieweesMap.get(reviewerId) ?? [])];
    shuffleInPlace(candidates);

    const chosen = new Set<string>();
    while (chosen.size < numReviewersNeeded) {
      candidates.sort(
        (a, b) =>
          (assignedForTeamMap.get(a)?.size ?? 0) -
          (assignedForTeamMap.get(b)?.size ?? 0)
      );
      const next = candidates.find(t => !chosen.has(t));
      if (!next) {
        throw new BadRequestError(
          `Unable to assign enough reviews for ${label} reviewer ${reviewerId}.` +
            'Consider allowing reviews of teams with same TA or reducing reviewsPerReviewer.'
        );
      }
      if (!assignedForTeamMap.has(next))
        assignedForTeamMap.set(next, new Set());
      assignedForTeamMap.get(next)!.add(reviewerId);
      chosen.add(next);
    }
  }
};

/* ------ Sub Functions for AddManualAssignment ------ */

const checkReviewerIsEligible = async (
  reviewerType: 'Individual' | 'Team',
  teamSetId: string,
  reviewerId: string,
  revieweeId: string
) => {
  if (reviewerType === 'Individual') {
    // Reviewer must be a member of a team in the team set
    const reviewerTeam = await TeamModel.findOne({
      teamSet: teamSetId,
      members: reviewerId,
    })
      .select('_id members')
      .lean();
    if (!reviewerTeam) {
      throw new NotFoundError(
        'Reviewer not found as a member of any team in the peer review team set'
      );
    }

    if (reviewerTeam._id.toString() === revieweeId) {
      throw new BadRequestError('Reviewer cannot review their own team');
    }
  } else {
    // Reviewer must be a team in the team set
    const reviewerTeam = await TeamModel.findOne({
      teamSet: teamSetId,
      _id: reviewerId,
    })
      .select('_id')
      .lean();
    if (!reviewerTeam) {
      throw new NotFoundError(
        'Reviewer team not found in the peer review team set'
      );
    }
    if (reviewerId === revieweeId) {
      throw new BadRequestError('Team cannot review itself');
    }
  }
};

const checkMaxReviewsNotExceeded = async (
  reviewerType: 'Individual' | 'Team',
  peerReviewId: string,
  reviewerId: string,
  maxPerReviewer: number
) => {
  if (reviewerType === 'Individual') {
    const currentAssignmentsCount =
      await PeerReviewAssignmentModel.countDocuments({
        peerReviewId,
        studentReviewers: reviewerId,
      });
    if (currentAssignmentsCount >= maxPerReviewer) {
      throw new BadRequestError(
        'Reviewer has reached the maximum number of assigned reviews'
      );
    }
  } else {
    const currentAssignmentsCount =
      await PeerReviewAssignmentModel.countDocuments({
        peerReviewId,
        teamReviewers: reviewerId,
      });
    if (currentAssignmentsCount >= maxPerReviewer) {
      throw new BadRequestError(
        'Reviewer team has reached the maximum number of assigned reviews'
      );
    }
  }
};

const checkIsNotDuplicateAssignment = async (
  peerReviewId: string,
  revieweeId: string,
  reviewerId: string,
  reviewerType: 'Individual' | 'Team'
) => {
  const existingAssignment = await PeerReviewAssignmentModel.findOne({
    peerReviewId,
    reviewee: revieweeId,
    ...(reviewerType === 'Individual'
      ? { studentReviewers: reviewerId }
      : { teamReviewers: reviewerId }),
  }).lean();
  if (existingAssignment) {
    throw new BadRequestError(
      'This reviewer is already assigned to this reviewee'
    );
  }
};

const upsertAssignment = async (
  peerReviewId: string,
  revieweeId: string,
  reviewerId: string,
  reviewerType: 'Individual' | 'Team',
  userId: string,
  teamData: { repoName: string } | null
) => {
  const add =
    reviewerType === 'Individual'
      ? { $addToSet: { studentReviewers: oid(reviewerId) } }
      : { $addToSet: { teamReviewers: oid(reviewerId) } };

  await PeerReviewAssignmentModel.updateOne(
    { peerReviewId, reviewee: oid(revieweeId) },
    {
      ...add,
      $setOnInsert: {
        peerReviewId,
        reviewee: oid(revieweeId),
        repoName: teamData ? teamData.repoName || '' : '',
        repoUrl: 'https://github.com/gongg21/AddSubtract.git',
        taReviewers: [],
        assignedBy: oid(userId),
        assignedAt: new Date(),
        status: 'Pending' as const,
      },
    },
    { upsert: true }
  );
};
