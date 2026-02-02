import PeerReviewModel from '@models/PeerReview';
import CourseModel from '@models/Course';
import { NotFoundError } from './errors';
import mongoose, { Types } from 'mongoose';
import PeerReviewAssignmentModel from '@models/PeerReviewAssignment';
import PeerReviewCommentModel from '@models/PeerReviewComment';
import PeerReviewSubmissionModel from '@models/PeerReviewSubmission';
import {
  PeerReviewTeamMemberDTO,
  PeerReviewInfoDTO,
  PeerReviewAssignment,
  TAToAssignmentsMap,
  AssignedReviewDTO,
  RevieweeAssignmentsDTO,
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
  
  const ctx = await buildPeerReviewScopeContext(
    userId,
    userCourseRole,
    courseId,
    peerReviewId,
    peerReview.reviewerType,
    peerReview.taAssignments,
    peerReview.teamSetId.toString(),
  );
  
  if (ctx.scopedTeams.length === 0)
    return emptyPeerReviewInfo(peerReviewId, peerReview.reviewerType);
  
  const assignmentState = await loadAssignmentsState(
    peerReviewId,
    ctx.scopedTeamIds,
  );
  
  const reviewerScope = computeReviewerScope(
    userId,
    userCourseRole,
    peerReview.reviewerType,
    peerReview.taAssignments,
    ctx.scopedTeams,
  );
  
  const submissions = await loadSubmissionsForScope(
    peerReviewId,
    peerReview.reviewerType,
    peerReview.taAssignments,
    reviewerScope.scopedMemberIds,
    reviewerScope.scopedReviewerTeamIds,
    reviewerScope.taIdsWanted,
  );
  
  await addMissingAssignmentsForSubmissions(
    submissions,
    assignmentState.assignmentById,
  );
  
  const assignedReviewMaps = buildAssignedReviewMaps(
    submissions,
    assignmentState.assignmentById,
    reviewerScope.taIdsWanted,
    ctx.usersById,
  );
  
  if (userCourseRole !== COURSE_ROLE.Student) {
    populateAssignmentsOfTeamReviewers(
      assignmentState.assignmentsOfTeam,
      submissions,
      assignmentState.assignmentById,
      ctx.usersById,
      ctx.teamNumberById,
    );
  }

  const teams = buildTeamsDTO(
    peerReview.reviewerType,
    ctx.scopedTeams,
    ctx.teamDataById,
    ctx.usersById,
    assignedReviewMaps.memberAssignedMap,
    assignedReviewMaps.teamAssignedMap,
  );

  return {
    _id: peerReviewId,
    reviewerType: peerReview.reviewerType,
    teams,
    assignmentsOfTeam: assignmentState.assignmentsOfTeam,
    TAAssignments: assignedReviewMaps.assignmentsForTAs,
    capabilities: { assignmentPageTeamIds: ctx.scopedTeamIds },
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
    taAssignments: boolean;
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
    taAssignments,
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
    taAssignments,
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
    taAssignments,
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
    ...(taAssignments !== undefined && { taAssignments }),
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
const buildPeerReviewScopeContext = async (
  userId: string,
  userCourseRole: string,
  courseId: string,
  peerReviewId: string,
  reviewerType: 'Individual' | 'Team',
  taAssignmentsEnabled: boolean,
  teamSetId: string,
) => {
  const { teamIds, filterByTA } = await getScopedTeamIds(
    userId,
    userCourseRole,
    teamSetId
  );

  const scopedTeams = await getScopedTeams(teamSetId, teamIds, filterByTA);
  const scopedTeamIds = scopedTeams.map(t => t.id);

  const teamDataById = await getTeamDataById(
    courseId,
    scopedTeams.map(t => t.number)
  );

  const usersById = await getUsersByIdForTeams(scopedTeams);
  const teamNumberById = new Map(scopedTeams.map(t => [t.id, t.number]));

  return { scopedTeams, scopedTeamIds, teamDataById, usersById, teamNumberById };
};

const loadAssignmentsState = async (
  peerReviewId: string,
  scopedTeamIds: string[],
) => {
  const assignmentDocs = await PeerReviewAssignmentModel.find({
    peerReviewId: oid(peerReviewId),
    revieweeTeamId: { $in: scopedTeamIds.map(oid) },
  }).lean();

  const assignmentById = new Map<string, PeerReviewAssignment>();
  const assignmentsOfTeam: Record<string, RevieweeAssignmentsDTO> = {};

  for (const a of assignmentDocs) {
    const assignmentDto: PeerReviewAssignment = {
      _id: a._id.toString(),
      peerReviewId: a.peerReviewId.toString(),
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      deadline: a.deadline ?? null,
      reviewee: a.reviewee.toString(),
      repoName: 'AddSubtract',
      repoUrl: 'https://github.com/gongg21/AddSubtract.git',
    };

    assignmentById.set(assignmentDto._id, assignmentDto);

    assignmentsOfTeam[assignmentDto.reviewee] = {
      assignment: assignmentDto,
      reviewers: { students: [], teams: [], TAs: [] },
    };
  }

  return { assignmentById, assignmentsOfTeam };
};

const computeReviewerScope = (
  userId: string,
  userCourseRole: string,
  reviewerType: 'Individual' | 'Team',
  taAssignmentsEnabled: boolean,
  scopedTeams: NormalizedTeam[],
) => {
  const scopedMemberIds = userCourseRole === COURSE_ROLE.Student
    ? [userId]
    : Array.from(new Set(scopedTeams.flatMap(t => t.memberIds)));
  const scopedReviewerTeamIds = scopedTeams.map(t => t.id);

  const taIdsWanted =
    !taAssignmentsEnabled
      ? []
      : userCourseRole === COURSE_ROLE.Faculty
        ? (scopedTeams.map(t => t.taId).filter(Boolean) as string[])
        : userCourseRole === COURSE_ROLE.TA
          ? [userId]
          : [];

  return { scopedMemberIds, scopedReviewerTeamIds, taIdsWanted };
};

const loadSubmissionsForScope = async (
  peerReviewId: string,
  reviewerType: 'Individual' | 'Team',
  taAssignmentsEnabled: boolean,
  scopedMemberIds: string[],
  scopedTeamIds: string[],
  taIdsWanted: string[],
) => {
  const [studentSubs, teamSubs, taSubs] = await Promise.all([
    reviewerType === 'Individual'
      ? PeerReviewSubmissionModel.find({
          peerReviewId: oid(peerReviewId),
          reviewerKind: 'Student',
          reviewerUserId: { $in: scopedMemberIds.map(oid) },
        }).lean()
      : Promise.resolve([]),

    reviewerType === 'Team'
      ? PeerReviewSubmissionModel.find({
          peerReviewId: oid(peerReviewId),
          reviewerKind: 'Team',
          reviewerTeamId: { $in: scopedTeamIds.map(oid) },
        }).lean()
      : Promise.resolve([]),

    taAssignmentsEnabled && taIdsWanted.length > 0
      ? PeerReviewSubmissionModel.find({
          peerReviewId: oid(peerReviewId),
          reviewerKind: 'TA',
          reviewerUserId: { $in: taIdsWanted.map(oid) },
        }).lean()
      : Promise.resolve([]),
  ]);

  return { studentSubs, teamSubs, taSubs };
};

const addMissingAssignmentsForSubmissions = async (
  submissions: { studentSubs: any[]; teamSubs: any[]; taSubs: any[] },
  assignmentById: Map<string, PeerReviewAssignment>,
) => {
  const neededIds = new Set<string>();
  for (const s of [...submissions.studentSubs, ...submissions.teamSubs, ...submissions.taSubs]) {
    neededIds.add(s.peerReviewAssignmentId.toString());
  }

  const missing = [...neededIds].filter(id => !assignmentById.has(id));
  if (missing.length === 0) return;

  const extra = await PeerReviewAssignmentModel.find({
    _id: { $in: missing.map(oid) },
  }).lean();

  for (const a of extra) {
    assignmentById.set(a._id.toString(), {
      _id: a._id.toString(),
      peerReviewId: a.peerReviewId.toString(),
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      deadline: a.deadline ?? null,
      reviewee: a.reviewee.toString(),
      repoName: 'AddSubtract',
      repoUrl: 'https://github.com/gongg21/AddSubtract.git',
    });
  }
};

const buildAssignedReviewMaps = (
  submissions: { studentSubs: any[]; teamSubs: any[]; taSubs: any[] },
  assignmentById: Map<string, PeerReviewAssignment>,
  taIdsWanted: string[],
  usersById: Map<string, string>,
) => {
  const memberAssignedMap = new Map<string, AssignedReviewDTO[]>();
  for (const s of submissions.studentSubs) {
    const rid = s.reviewerUserId?.toString();
    if (!rid) continue;

    const dto = toAssignedReviewDTO(s, assignmentById);
    if (!dto) continue;

    const arr = memberAssignedMap.get(rid) ?? [];
    arr.push(dto);
    memberAssignedMap.set(rid, arr);
  }

  const teamAssignedMap = new Map<string, AssignedReviewDTO[]>();
  for (const s of submissions.teamSubs) {
    const tid = s.reviewerTeamId?.toString();
    if (!tid) continue;

    const dto = toAssignedReviewDTO(s, assignmentById);
    if (!dto) continue;

    const arr = teamAssignedMap.get(tid) ?? [];
    arr.push(dto);
    teamAssignedMap.set(tid, arr);
  }

  const assignmentsForTAs: TAToAssignmentsMap = {};
  for (const taId of taIdsWanted) {
    assignmentsForTAs[taId] = {
      taName: usersById.get(taId) ?? 'Unknown',
      assignedReviews: [],
    };
  }

  for (const s of submissions.taSubs) {
    const taId = s.reviewerUserId?.toString();
    if (!taId) continue;

    const dto = toAssignedReviewDTO(s, assignmentById);
    if (!dto) continue;

    assignmentsForTAs[taId]?.assignedReviews.push(dto);
  }

  return { memberAssignedMap, teamAssignedMap, assignmentsForTAs };
};

const populateAssignmentsOfTeamReviewers = (
  assignmentsOfTeam: Record<string, RevieweeAssignmentsDTO>,
  submissions: { studentSubs: any[]; teamSubs: any[]; taSubs: any[] },
  assignmentById: Map<string, PeerReviewAssignment>,
  usersById: Map<string, string>,
  teamNumberById: Map<string, number>,
) => {
  for (const s of submissions.studentSubs) {
    const assignment = assignmentById.get(s.peerReviewAssignmentId.toString());
    if (!assignment) continue;

    const revieweeTeamId = assignment.reviewee;
    if (!assignmentsOfTeam[revieweeTeamId]) continue;

    const rid = s.reviewerUserId?.toString();
    if (!rid) continue;

    pushReviewer(assignmentsOfTeam, revieweeTeamId, 'Student', {
      userId: rid,
      name: usersById.get(rid) ?? 'Unknown',
      status: s.status,
    });
  }

  for (const s of submissions.teamSubs) {
    const assignment = assignmentById.get(s.peerReviewAssignmentId.toString());
    if (!assignment) continue;

    const revieweeTeamId = assignment.reviewee;
    if (!assignmentsOfTeam[revieweeTeamId]) continue;

    const tid = s.reviewerTeamId?.toString();
    if (!tid) continue;

    pushReviewer(assignmentsOfTeam, revieweeTeamId, 'Team', {
      teamId: tid,
      teamNumber: teamNumberById.get(tid) ?? -1,
      status: s.status,
    });
  }

  for (const s of submissions.taSubs) {
    const assignment = assignmentById.get(s.peerReviewAssignmentId.toString());
    if (!assignment) continue;

    const revieweeTeamId = assignment.reviewee;
    if (!assignmentsOfTeam[revieweeTeamId]) continue;

    const rid = s.reviewerUserId?.toString();
    if (!rid) continue;

    pushReviewer(assignmentsOfTeam, revieweeTeamId, 'TA', {
      userId: rid,
      name: usersById.get(rid) ?? 'Unknown',
      status: s.status,
    });
  }
};


const buildTeamsDTO = (
  reviewerType: 'Individual' | 'Team',
  scopedTeams: NormalizedTeam[],
  teamDataById: Map<string, { repoUrl: string; repoName: string; gitHubOrgName: string }>,
  usersById: Map<string, string>,
  memberAssignedMap: Map<string, AssignedReviewDTO[]>,
  teamAssignedMap: Map<string, AssignedReviewDTO[]>,
) => {
  return scopedTeams.map(team => {
    const teamData = teamDataById.get(team.number.toString());
    const taName = team.taId ? usersById.get(team.taId) ?? '' : '';

    const members: PeerReviewTeamMemberDTO[] = team.memberIds.map(memberId => ({
      userId: memberId,
      name: usersById.get(memberId) ?? 'Unknown',
      assignedReviews: memberAssignedMap.get(memberId) ?? [],
    }));

    const assignedReviewsToTeam =
      reviewerType === 'Team' ? teamAssignedMap.get(team.id) ?? [] : [];

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

// Helper Functions
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

const pushReviewer = (
  assignmentsOfTeam: Record<string, RevieweeAssignmentsDTO>,
  revieweeTeamId: string,
  kind: 'Student' | 'Team' | 'TA',
  payload: any
) => {
  const entry = assignmentsOfTeam[revieweeTeamId];
  if (!entry) return;

  if (kind === 'Student') entry.reviewers.students.push(payload);
  else if (kind === 'Team') entry.reviewers.teams.push(payload);
  else entry.reviewers.TAs.push(payload);
};

const toAssignedReviewDTO = (
  submission: any,
  assignmentById: Map<string, PeerReviewAssignment>
): AssignedReviewDTO | null => {
  const assignment = assignmentById.get(submission.peerReviewAssignmentId.toString());
  if (!assignment) return null;

  return {
    assignment,
    submissionId: submission._id.toString(),
    status: submission.status,
    startedAt: submission.startedAt,
    lastEditedAt: submission.lastEditedAt,
    submittedAt: submission.submittedAt,
    overallComment: submission.overallComment,
    totalScore: submission.totalScore,
  };
};
