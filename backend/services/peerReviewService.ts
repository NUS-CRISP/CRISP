import PeerReviewModel from '@models/PeerReview';
import CourseModel from '@models/Course';
import { BadRequestError, NotFoundError } from './errors';
import mongoose, { ClientSession, startSession, Types } from 'mongoose';
import PeerReviewAssignmentModel from '@models/PeerReviewAssignment';
import PeerReviewCommentModel from '@models/PeerReviewComment';
import PeerReviewSubmissionModel, {
  PeerReviewSubmission,
} from '@models/PeerReviewSubmission';
import {
  PeerReviewTeamMemberDTO,
  PeerReviewInfoDTO,
  PeerReviewAssignment,
  TAToAssignmentsMap,
  AssignedReviewDTO,
  RevieweeAssignmentsDTO,
  PeerReviewProgressOverviewDTO,
} from '@shared/types/PeerReview';
import {
  initialiseAssignments,
  deleteAssignmentsByPeerReviewId,
} from './peerReviewAssignmentService';
import { COURSE_ROLE } from '@shared/types/auth/CourseRole';
import UserModel, { User } from '@models/User';
import TeamModel from '@models/Team';
import { resolveTeamRepo } from './teamService';
import { PeerReviewGradingTaskModel } from '@models/PeerReviewGradingTask';

export interface NormalizedTeam {
  id: string;
  number: number;
  memberIds: string[];
  taId: string | null;
}

const oid = (s: string) => new Types.ObjectId(s);

const TEMP_FALLBACK_URL = 'https://github.com/gongg21/AddSubtract.git';

export const getAllPeerReviewsyId = async (courseId: string) => {
  const peerReviews = await PeerReviewModel.find({ course: courseId });
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
    peerReview.teamSetId.toString()
  );

  if (ctx.scopedTeams.length === 0)
    return emptyPeerReviewInfo(peerReviewId, peerReview.reviewerType);

  const assignmentState = await loadAssignmentsState(
    courseId,
    peerReviewId,
    ctx.scopedTeamIds
  );

  const reviewerScope = computeReviewerScope(
    userId,
    userCourseRole,
    peerReview.reviewerType,
    peerReview.taAssignments,
    ctx.scopedTeams
  );

  const submissions = await loadSubmissionsForScope(
    peerReviewId,
    peerReview.reviewerType,
    peerReview.taAssignments,
    reviewerScope.scopedMemberIds,
    reviewerScope.scopedReviewerTeamIds,
    reviewerScope.taIdsWanted
  );

  await addMissingAssignmentsForSubmissions(
    courseId,
    submissions,
    assignmentState.assignmentById
  );

  const assignedReviewMaps = buildAssignedReviewMaps(
    submissions,
    assignmentState.assignmentById,
    reviewerScope.taIdsWanted,
    ctx.usersById
  );

  if (userCourseRole !== COURSE_ROLE.Student) {
    populateAssignmentsOfTeamReviewers(
      assignmentState.assignmentsOfTeam,
      submissions,
      assignmentState.assignmentById,
      ctx.usersById,
      ctx.teamNumberById
    );
  }

  const teams = buildTeamsDTO(
    peerReview.reviewerType,
    ctx.scopedTeams,
    ctx.teamDataById,
    ctx.usersById,
    assignedReviewMaps.memberAssignedMap,
    assignedReviewMaps.teamAssignedMap
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

export const getPeerReviewProgressOverviewById = async (
  userId: string,
  userCourseRole: string,
  courseId: string,
  peerReviewId: string
): Promise<PeerReviewProgressOverviewDTO> => {
  const peerReview = await getPeerReviewById(peerReviewId);

  const ctx = await buildPeerReviewScopeContext(
    userId,
    userCourseRole,
    courseId,
    peerReviewId,
    peerReview.reviewerType,
    peerReview.taAssignments,
    peerReview.teamSetId.toString()
  );

  if (ctx.scopedTeamIds.length === 0) {
    return {
      peerReviewId,
      scope: userCourseRole === COURSE_ROLE.TA ? 'supervisingTeams' : 'course',
      submissions: {
        total: 0,
        notStarted: 0,
        draft: 0,
        submitted: 0,
        started: 0,
      },
      grading: {
        total: 0,
        graded: 0,
        inProgress: 0,
        notYetGraded: 0,
        toBeAssigned: 0,
      },
    };
  }

  let submissions:
    | Array<{
        _id: Types.ObjectId;
        status: 'NotStarted' | 'Draft' | 'Submitted';
      }>
    | any[] = [];

  if (userCourseRole === COURSE_ROLE.Faculty) {
    submissions = await PeerReviewSubmissionModel.find({
      peerReviewId: oid(peerReviewId),
      reviewerKind: { $in: ['Student', 'Team'] },
    })
      .select('_id status')
      .lean();
  } else {
    const reviewerScope = computeReviewerScope(
      userId,
      userCourseRole,
      peerReview.reviewerType,
      peerReview.taAssignments,
      ctx.scopedTeams
    );

    const scopedSubmissions = await loadSubmissionsForScope(
      peerReviewId,
      peerReview.reviewerType,
      false,
      reviewerScope.scopedMemberIds,
      reviewerScope.scopedReviewerTeamIds,
      []
    );

    submissions = [
      ...scopedSubmissions.studentSubs,
      ...scopedSubmissions.teamSubs,
    ];
  }

  const totalSubmissions = submissions.length;
  const notStarted = submissions.filter(s => s.status === 'NotStarted').length;
  const draft = submissions.filter(s => s.status === 'Draft').length;
  const submitted = submissions.filter(s => s.status === 'Submitted').length;
  const started = totalSubmissions - notStarted;

  if (totalSubmissions === 0) {
    return {
      peerReviewId,
      scope: userCourseRole === COURSE_ROLE.TA ? 'supervisingTeams' : 'course',
      submissions: {
        total: 0,
        notStarted: 0,
        draft: 0,
        submitted: 0,
        started: 0,
      },
      grading: {
        total: 0,
        graded: 0,
        inProgress: 0,
        notYetGraded: 0,
        toBeAssigned: 0,
      },
    };
  }

  const submissionIds = submissions.map(s => s._id);
  const tasks = await PeerReviewGradingTaskModel.find({
    peerReviewId: oid(peerReviewId),
    peerReviewSubmissionId: { $in: submissionIds },
  })
    .select('peerReviewSubmissionId status')
    .lean();

  const taskStatusBySubmissionId = new Map<string, Set<string>>();
  for (const task of tasks) {
    const sid = String(task.peerReviewSubmissionId);
    const set = taskStatusBySubmissionId.get(sid) ?? new Set<string>();
    set.add(task.status);
    taskStatusBySubmissionId.set(sid, set);
  }

  let graded = 0;
  let inProgress = 0;
  let notYetGraded = 0;
  let toBeAssigned = 0;

  for (const submission of submissions) {
    const statuses = taskStatusBySubmissionId.get(String(submission._id));
    if (!statuses || statuses.size === 0) {
      toBeAssigned++;
      continue;
    }

    // Definition precedence:
    // 1) Already Graded => any Completed task
    // 2) Is Grading => any InProgress task (draft grading)
    // 3) Not Yet Graded => assigned to TAs only (Assigned)
    if (statuses.has('Completed')) {
      graded++;
      continue;
    }

    if (statuses.has('InProgress')) {
      inProgress++;
      continue;
    }

    if (statuses.has('Assigned')) {
      notYetGraded++;
      continue;
    }

    toBeAssigned++;
  }

  return {
    peerReviewId,
    scope: userCourseRole === COURSE_ROLE.TA ? 'supervisingTeams' : 'course',
    submissions: {
      total: totalSubmissions,
      notStarted,
      draft,
      submitted,
      started,
    },
    grading: {
      total: totalSubmissions,
      graded,
      inProgress,
      notYetGraded,
      toBeAssigned,
    },
  };
};

export interface PeerReviewSettings {
  assessmentName: string;
  description: string;
  startDate: Date;
  endDate: Date;
  teamSetId: string;
  reviewerType: 'Individual' | 'Team';
  taAssignments: boolean;
  minReviews: number;
  maxReviews: number;
  internalAssessmentId?: string;
  gradingStartDate?: Date;
  gradingEndDate?: Date;
}

export const createPeerReviewById = async (
  courseId: string,
  peerReviewData: PeerReviewSettings,
  session: ClientSession
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
    internalAssessmentId,
    gradingStartDate,
    gradingEndDate,
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
    internalAssessmentId,
    gradingStartDate,
    gradingEndDate,
  });
  await newPeerReview.save();

  // Initialise assignments
  await initialiseAssignments(
    courseId,
    newPeerReview._id.toString(),
    teamSetId,
    session
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
  settingsData: PeerReviewSettings
) => {
  const pr = await PeerReviewModel.findById(peerReviewId);
  if (!pr) throw new NotFoundError('Peer review not found');

  // Determine if assignment structure should be reset BEFORE save()
  const structuralChanged =
    (settingsData.teamSetId !== undefined &&
      String(pr.teamSetId) !== String(settingsData.teamSetId)) ||
    (settingsData.reviewerType !== undefined &&
      pr.reviewerType !== settingsData.reviewerType) ||
    (settingsData.taAssignments !== undefined &&
      pr.taAssignments !== settingsData.taAssignments) ||
    (settingsData.minReviews !== undefined &&
      pr.minReviewsPerReviewer !== Number(settingsData.minReviews)) ||
    (settingsData.maxReviews !== undefined &&
      pr.maxReviewsPerReviewer !== Number(settingsData.maxReviews));

  // map request -> model fields
  if (settingsData.assessmentName !== undefined)
    pr.title = settingsData.assessmentName;
  if (settingsData.description !== undefined)
    pr.description = settingsData.description;

  if (settingsData.startDate !== undefined)
    pr.startDate = new Date(settingsData.startDate);
  if (settingsData.endDate !== undefined)
    pr.endDate = new Date(settingsData.endDate);

  if (settingsData.teamSetId !== undefined)
    pr.teamSetId = settingsData.teamSetId as any;
  if (settingsData.reviewerType !== undefined)
    pr.reviewerType = settingsData.reviewerType;

  if (settingsData.taAssignments !== undefined)
    pr.taAssignments = settingsData.taAssignments;

  if (settingsData.minReviews !== undefined)
    pr.minReviewsPerReviewer = Number(settingsData.minReviews);
  if (settingsData.maxReviews !== undefined)
    pr.maxReviewsPerReviewer = Number(settingsData.maxReviews);

  if (settingsData.gradingStartDate !== undefined)
    pr.gradingStartDate = settingsData.gradingStartDate
      ? new Date(settingsData.gradingStartDate)
      : undefined;
  if (settingsData.gradingEndDate !== undefined)
    pr.gradingEndDate = settingsData.gradingEndDate
      ? new Date(settingsData.gradingEndDate)
      : undefined;

  await pr.save();

  if (structuralChanged) {
    await deleteAssignmentsByPeerReviewId(peerReviewId);
    await initialiseAssignments(
      pr.course.toString(),
      peerReviewId,
      pr.teamSetId.toString(),
      null
    );
  }

  return pr;
};

/* ----- Sub Functions for GetPeerReviewInfo ----- */
const buildPeerReviewScopeContext = async (
  userId: string,
  userCourseRole: string,
  courseId: string,
  peerReviewId: string,
  reviewerType: 'Individual' | 'Team',
  taAssignmentsEnabled: boolean,
  teamSetId: string
) => {
  const { teamIds, filterByTA } = await getScopedTeamIds(
    userId,
    userCourseRole,
    teamSetId
  );

  const scopedTeams = await getScopedTeams(teamSetId, teamIds, filterByTA);
  const scopedTeamIds = scopedTeams.map(t => t.id);

  const teamDataById = await getTeamDataById(courseId, scopedTeamIds);

  const usersById = await getUsersByIdForTeams(scopedTeams);
  const teamNumberById = new Map(scopedTeams.map(t => [t.id, t.number]));

  return {
    scopedTeams,
    scopedTeamIds,
    teamDataById,
    usersById,
    teamNumberById,
  };
};

const loadAssignmentsState = async (
  courseId: string,
  peerReviewId: string,
  scopedTeamIds: string[]
) => {
  const assignmentDocs = await PeerReviewAssignmentModel.find({
    peerReviewId: oid(peerReviewId),
    reviewee: { $in: scopedTeamIds.map(oid) },
  }).lean();

  const assignmentById = new Map<string, PeerReviewAssignment>();
  const assignmentsOfTeam: Record<string, RevieweeAssignmentsDTO> = {};

  for (const a of assignmentDocs) {
    const reviewee = await TeamModel.findById(a.reviewee)
      .populate('TA', '_id name')
      .lean();
    const { repoName, repoUrl } = await resolveTeamRepo(
      courseId,
      a.reviewee.toString()
    );
    if (!reviewee) continue;

    const revieweeTA =
      reviewee.TA && typeof reviewee.TA === 'object'
        ? { ...reviewee.TA, _id: reviewee.TA._id.toString() }
        : null;

    const assignmentDto: PeerReviewAssignment = {
      _id: a._id.toString(),
      peerReviewId: a.peerReviewId.toString(),
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      deadline: a.deadline ?? null,
      reviewee: {
        ...(reviewee as any),
        _id: reviewee._id.toString(),
        TA: revieweeTA as any,
      },
      repoName: repoName,
      repoUrl: repoUrl ?? TEMP_FALLBACK_URL,
    };

    assignmentById.set(assignmentDto._id, assignmentDto);

    assignmentsOfTeam[assignmentDto.reviewee._id] = {
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
  scopedTeams: NormalizedTeam[]
) => {
  const scopedMemberIds =
    userCourseRole === COURSE_ROLE.Student
      ? [userId]
      : Array.from(new Set(scopedTeams.flatMap(t => t.memberIds)));
  const scopedReviewerTeamIds = scopedTeams.map(t => t.id);

  const taIdsWanted = !taAssignmentsEnabled
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
  taIdsWanted: string[]
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
  courseId: string,
  submissions: {
    studentSubs: PeerReviewSubmission[];
    teamSubs: PeerReviewSubmission[];
    taSubs: PeerReviewSubmission[];
  },
  assignmentById: Map<string, PeerReviewAssignment>
) => {
  const neededIds = new Set<string>();
  for (const s of [
    ...submissions.studentSubs,
    ...submissions.teamSubs,
    ...submissions.taSubs,
  ]) {
    neededIds.add(s.peerReviewAssignmentId.toString());
  }

  const missing = [...neededIds].filter(id => !assignmentById.has(id));
  if (missing.length === 0) return;

  const extra = await PeerReviewAssignmentModel.find({
    _id: { $in: missing.map(oid) },
  }).lean();

  for (const a of extra) {
    const reviewee = await TeamModel.findById(a.reviewee)
      .populate('TA', '_id name')
      .lean();
    const { repoName, repoUrl } = await resolveTeamRepo(
      courseId,
      a.reviewee.toString()
    );
    if (!reviewee) continue;

    const revieweeTA =
      reviewee.TA && typeof reviewee.TA === 'object'
        ? { ...reviewee.TA, _id: reviewee.TA._id.toString() }
        : null;

    assignmentById.set(a._id.toString(), {
      _id: a._id.toString(),
      peerReviewId: a.peerReviewId.toString(),
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      deadline: a.deadline ?? null,
      reviewee: {
        ...(reviewee as any),
        _id: reviewee._id.toString(),
        TA: revieweeTA as any,
      },
      repoName: repoName,
      repoUrl: repoUrl ?? TEMP_FALLBACK_URL,
    });
  }
};

const buildAssignedReviewMaps = (
  submissions: {
    studentSubs: PeerReviewSubmission[];
    teamSubs: PeerReviewSubmission[];
    taSubs: PeerReviewSubmission[];
  },
  assignmentById: Map<string, PeerReviewAssignment>,
  taIdsWanted: string[],
  usersById: Map<string, string>
) => {
  const memberAssignedMap = new Map<string, AssignedReviewDTO[]>();
  for (const s of submissions.studentSubs) {
    const rid = s.reviewerUserId?.toString();
    const dto = toAssignedReviewDTO(s, assignmentById);
    if (!dto) continue;

    const arr = memberAssignedMap.get(rid!) ?? [];
    arr.push(dto);
    memberAssignedMap.set(rid!, arr);
  }

  const teamAssignedMap = new Map<string, AssignedReviewDTO[]>();
  for (const s of submissions.teamSubs) {
    const tid = s.reviewerTeamId?.toString();
    const dto = toAssignedReviewDTO(s, assignmentById);
    if (!dto) continue;

    const arr = teamAssignedMap.get(tid!) ?? [];
    arr.push(dto);
    teamAssignedMap.set(tid!, arr);
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
    const dto = toAssignedReviewDTO(s, assignmentById);
    if (!dto) continue;

    assignmentsForTAs[taId!]?.assignedReviews.push(dto);
  }

  return { memberAssignedMap, teamAssignedMap, assignmentsForTAs };
};

const populateAssignmentsOfTeamReviewers = (
  assignmentsOfTeam: Record<string, RevieweeAssignmentsDTO>,
  submissions: {
    studentSubs: PeerReviewSubmission[];
    teamSubs: PeerReviewSubmission[];
    taSubs: PeerReviewSubmission[];
  },
  assignmentById: Map<string, PeerReviewAssignment>,
  usersById: Map<string, string>,
  teamNumberById: Map<string, number>
) => {
  for (const s of submissions.studentSubs) {
    const assignment = assignmentById.get(s.peerReviewAssignmentId.toString());
    if (!assignment) continue;

    const revieweeTeamId = assignment.reviewee._id;
    if (!assignmentsOfTeam[revieweeTeamId]) continue;

    const rid = s.reviewerUserId?.toString();
    if (!rid) continue;

    pushReviewer(assignmentsOfTeam, revieweeTeamId, 'Student', {
      userId: rid,
      teamId: '',
      name: usersById.get(rid) ?? 'Unknown',
      teamNumber: -1,
      status: s.status,
    });
  }

  for (const s of submissions.teamSubs) {
    const assignment = assignmentById.get(s.peerReviewAssignmentId.toString());
    if (!assignment) continue;

    const revieweeTeamId = assignment.reviewee._id;
    if (!assignmentsOfTeam[revieweeTeamId]) continue;

    const tid = s.reviewerTeamId?.toString();
    if (!tid) continue;

    pushReviewer(assignmentsOfTeam, revieweeTeamId, 'Team', {
      userId: '',
      teamId: tid,
      name: '',
      teamNumber: teamNumberById.get(tid) ?? -1,
      status: s.status,
    });
  }

  for (const s of submissions.taSubs) {
    const assignment = assignmentById.get(s.peerReviewAssignmentId.toString());
    if (!assignment) continue;

    const revieweeTeamId = assignment.reviewee._id;
    if (!assignmentsOfTeam[revieweeTeamId]) continue;

    const rid = s.reviewerUserId?.toString();
    if (!rid) continue;

    pushReviewer(assignmentsOfTeam, revieweeTeamId, 'TA', {
      userId: rid,
      teamId: '',
      name: usersById.get(rid) ?? 'Unknown',
      teamNumber: -1,
      status: s.status,
    });
  }
};

const buildTeamsDTO = (
  reviewerType: 'Individual' | 'Team',
  scopedTeams: NormalizedTeam[],
  teamDataById: Map<
    string,
    { repoUrl: string; repoName: string; gitHubOrgName: string }
  >,
  usersById: Map<string, string>,
  memberAssignedMap: Map<string, AssignedReviewDTO[]>,
  teamAssignedMap: Map<string, AssignedReviewDTO[]>
) => {
  return scopedTeams.map(team => {
    const teamData = teamDataById.get(team.id);
    const taName = team.taId ? (usersById.get(team.taId) ?? '') : '';

    const members: PeerReviewTeamMemberDTO[] = team.memberIds.map(memberId => ({
      userId: memberId,
      name: usersById.get(memberId) ?? 'Unknown',
      assignedReviews: memberAssignedMap.get(memberId) ?? [],
    }));

    const assignedReviewsToTeam =
      reviewerType === 'Team' ? (teamAssignedMap.get(team.id) ?? []) : [];

    return {
      teamId: team.id,
      teamNumber: team.number,
      repoUrl: teamData!.repoUrl,
      repoName: teamData!.repoName,
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
    const teams = await TeamModel.find({
      teamSet: teamSetId,
      TA: userId,
    })
      .select('_id')
      .lean();
    return { teamIds: teams.map(t => t._id.toString()), filterByTA: userId };
  }

  const teams = await TeamModel.find({ teamSet: teamSetId })
    .select('_id')
    .lean();

  return { teamIds: teams.map(t => t._id.toString()) };
};

const getScopedTeams = async (
  teamSetId: string,
  teamIds: string[],
  filterByTA?: string
): Promise<NormalizedTeam[]> => {
  const teamQuery: { [key: string]: string | { $in: string[] } } = {
    teamSet: teamSetId,
  };
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

export const getTeamDataById = async (courseId: string, teamIds: string[]) => {
  const entries = await Promise.all(
    teamIds.map(async teamId => {
      const { repoName, repoUrl, gitHubOrgName } = await resolveTeamRepo(
        courseId,
        teamId
      );

      return [
        teamId,
        {
          gitHubOrgName: gitHubOrgName,
          repoName: repoName,
          repoUrl: repoUrl,
        },
      ] as const;
    })
  );

  const teamDataById = new Map(entries);
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
  payload: {
    userId: string;
    name: string;
    teamId: string;
    teamNumber: number;
    status: PeerReviewSubmission['status'];
  }
) => {
  const entry = assignmentsOfTeam[revieweeTeamId];
  if (!entry) return;

  if (kind === 'Student') entry.reviewers.students.push(payload);
  else if (kind === 'Team') entry.reviewers.teams.push(payload);
  else entry.reviewers.TAs.push(payload);
};

const toAssignedReviewDTO = (
  submission: PeerReviewSubmission,
  assignmentById: Map<string, PeerReviewAssignment>
): AssignedReviewDTO | null => {
  const assignment = assignmentById.get(
    submission.peerReviewAssignmentId.toString()
  );
  if (!assignment) return null;

  return {
    assignment,
    submissionId: submission._id.toString(),
    status: submission.status,
    startedAt: submission.startedAt,
    lastEditedAt: submission.lastEditedAt,
    submittedAt: submission.submittedAt,
    overallComment: submission.overallComment,
  };
};

export const __testables = {
  emptyPeerReviewInfo,
  getScopedTeamIds,
  getScopedTeams,
  loadAssignmentsState,
  computeReviewerScope,
  addMissingAssignmentsForSubmissions,
  buildAssignedReviewMaps,
  populateAssignmentsOfTeamReviewers,
  buildTeamsDTO,
  pushReviewer,
  toAssignedReviewDTO,
};
