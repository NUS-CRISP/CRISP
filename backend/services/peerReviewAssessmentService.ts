/* eslint-disable @typescript-eslint/no-explicit-any */
import InternalAssessmentModel from '../models/InternalAssessment';
import CourseModel from '../models/Course';
import { NotFoundError, BadRequestError, MissingAuthorizationError } from './errors';
import mongoose, { Types } from 'mongoose';
import TeamSetModel from '@models/TeamSet';
import { createAssignmentSet } from './assessmentAssignmentSetService';
import AssessmentResultModel from '@models/AssessmentResult';
import { deleteInternalAssessmentById } from './internalAssessmentService';
import { createPeerReviewById, PeerReviewSettings, updatePeerReviewById, deletePeerReviewById } from './peerReviewService';
import PeerReviewModel from '@models/PeerReview';
import { ReviewerRef } from '@shared/types/PeerReview';
import { PeerReviewGradingDTO, PeerReviewMyGradingTaskDTO, PeerReviewResultsDTO, PeerReviewResultsStudentRow, PeerReviewResultsTeamCard, PeerReviewSubmissionListItemDTO, PeerReviewSubmissionsDTO } from '@shared/types/PeerReviewAssessment';
import PeerReviewSubmissionModel from '@models/PeerReviewSubmission';
import PeerReviewAssignmentModel from '@models/PeerReviewAssignment';
import TeamModel from '@models/Team';
import UserModel from '@models/User';
import { PeerReviewGradingTaskModel } from '@models/PeerReviewGradingTask';
import { COURSE_ROLE } from '@shared/types/auth/CourseRole';
import { getPeerReviewCommentsBySubmissionId } from './peerReviewCommentsService';

const oid = (s: string) => new Types.ObjectId(s);

/* ------------------------------- Peer Review Assessment ------------------------------- */

export const getPeerReviewByAssessmentId = async (assessmentId: string) => {
  const peerReview = await PeerReviewModel.findOne({
    internalAssessmentId: assessmentId,
  });
  if (!peerReview) throw new NotFoundError('Peer review not found for assessment');
  return peerReview;
};  

interface PeerReviewAssessmentData {
  // Shared fields for both internal assessment and peer review objects
  assessmentName: string;
  description: string;
  startDate: Date;
  endDate: Date;
  
  // Peer review fields
  teamSetId: string;
  reviewerType: 'Individual' | 'Team';
  taAssignments: boolean;
  minReviews: number;
  maxReviews: number;
  gradingStartDate?: Date;
  gradingEndDate?: Date;
  
  // Assessment fields
  maxMarks?: number;
  scaleToMaxMarks: boolean;
}

export const createPeerReviewAssessmentForCourse = async (
  courseId: string,
  peerReviewAssessmentData: PeerReviewAssessmentData
) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const {
    assessmentName,
    description,
    startDate,
    endDate,
    teamSetId,
    reviewerType,
    taAssignments,
    minReviews,
    maxReviews,
    gradingStartDate,
    gradingEndDate,
    maxMarks,
    scaleToMaxMarks,
  } = peerReviewAssessmentData;

  try {
    const course = await CourseModel.findById(courseId)
      .populate('students')
      .session(session);
    if (!course) throw new NotFoundError('Course not found');

    const teamSet = await TeamSetModel.findById(teamSetId).session(session);
    if (!teamSet) throw new NotFoundError('TeamSet not found');

    // 1. Create InternalAssessment (peer_review type)
    const assessment = await new InternalAssessmentModel({
      course: courseId,
      assessmentName: assessmentName,
      assessmentType: 'peer_review',
      description: description,
      startDate: startDate,
      endDate: endDate,
      maxMarks: maxMarks,
      scaleToMaxMarks: scaleToMaxMarks,
      granularity: reviewerType.toLowerCase(),
      teamSet: teamSet._id,
      areSubmissionsEditable: false,
      results: [],
      isReleased: false,
      questions: [], // no questions for peer review
      questionsTotalMarks: 0,
      releaseNumber: 0,
    }).save({ session });

    // 2) Create AssessmentResults for all students
    const results = await Promise.all(
      (course.students as any[]).map(student =>
        new AssessmentResultModel({
          assessment: assessment._id,
          student,
          marks: [],
          averageScore: 0,
        }).save({ session })
      )
    );

    assessment.results = results.map(r => r._id);
    await assessment.save({ session });

    course.internalAssessments.push(assessment._id);
    await course.save({ session });

    // 3. Create PeerReview linked to InternalAssessment
    const createPeerReviewData: PeerReviewSettings = {
      assessmentName: assessmentName,
      description: description,
      startDate: startDate,
      endDate: endDate,
      teamSetId: teamSetId,
      reviewerType: reviewerType,
      taAssignments: taAssignments,
      minReviews: minReviews,
      maxReviews: maxReviews,
      gradingStartDate: gradingStartDate,
      gradingEndDate: gradingEndDate,
      internalAssessmentId: assessment._id.toString(),
    }
    const newPeerReview = await createPeerReviewById(courseId, createPeerReviewData, session);

    await session.commitTransaction();
    session.endSession();

    try {
      await createAssignmentSet(assessment._id.toString(), teamSet._id.toString());
    } catch (e) {
      console.error('createAssignmentSet failed:', e);
    }
    
    return newPeerReview;
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    throw e;
  }
};

export const updatePeerReviewAssessmentById = async (
  assessmentId: string,
  updateData: PeerReviewAssessmentData,
) => {
  const existing = await InternalAssessmentModel.findById(assessmentId).select('assessmentType');
  if (!existing) throw new NotFoundError('Peer review assessment not found');
  if (existing.assessmentType !== 'peer_review')
    throw new BadRequestError('Assessment is not a peer review assessment');

  const updatedAssessmentData = {
    assessmentName: updateData.assessmentName,
    description: updateData.description,
    startDate: updateData.startDate,
    endDate: updateData.endDate,
    maxMarks: updateData.maxMarks,
    scaleToMaxMarks: updateData.scaleToMaxMarks,
    granularity: updateData.reviewerType.toLowerCase(),
    areSubmissionsEditable: false,
  };
  
  const updatedAssessment = await InternalAssessmentModel.findByIdAndUpdate(
    assessmentId,
    updatedAssessmentData,
    { new: true }
  );

  if (!updatedAssessment) throw new NotFoundError('Peer review assessment not found');
  
  const pr = await PeerReviewModel.findOne({ internalAssessmentId: assessmentId }).select('_id');
  if (!pr) throw new NotFoundError('Peer review not found for this assessment');

  const updatedPeerReviewData: PeerReviewSettings = {
    assessmentName: updateData.assessmentName,
    description: updateData.description,
    startDate: updateData.startDate,
    endDate: updateData.endDate,
    teamSetId: updateData.teamSetId,
    reviewerType: updateData.reviewerType,
    taAssignments: updateData.taAssignments,
    minReviews: updateData.minReviews,
    maxReviews: updateData.maxReviews,
    gradingStartDate: updateData.gradingStartDate,
    gradingEndDate: updateData.gradingEndDate,
  }
  
  const updatedPeerReview = await updatePeerReviewById(pr._id.toString(), updatedPeerReviewData);
  if (!updatedPeerReview) throw new NotFoundError('Failed to update peer review with new settings');

  return { updatedAssessment, updatedPeerReview };
};

export const deletePeerReviewAssessmentById = async (assessmentId: string) => {
  const pr = await PeerReviewModel.findOne({ internalAssessmentId: assessmentId }).select('_id');
  if (!pr) throw new NotFoundError('Peer review not found for this assessment');
  
  const deletedRes = await deletePeerReviewById(pr._id.toString());
  await deleteInternalAssessmentById(assessmentId);
  
  return deletedRes;
}

/* ------------------------------- Peer Review Assessment Submissions ------------------------------- */

const lastActivityAt = (s: any) => s.submittedAt ?? s.lastEditedAt ?? s.startedAt ?? s.createdAt;

export const getPeerReviewSubmissionsForAssessmentById = async (
  assessmentId: string,
  userId: string,
  userCourseRole: string,
): Promise<PeerReviewSubmissionsDTO> => {
  const assessment = await InternalAssessmentModel.findById(assessmentId).select(
    '_id assessmentType maxMarks'
  );
  if (!assessment) throw new NotFoundError('Assessment not found');
  if (assessment.assessmentType !== 'peer_review')
    throw new BadRequestError('Not a peer review assessment');

  const peerReview = await PeerReviewModel.findOne({
    internalAssessmentId: assessmentId,
  }).select(
    '_id reviewerType taAssignments internalAssessmentId'
  );
  if (!peerReview) throw new NotFoundError('Peer review not found for assessment');
  
  let allowedSubmissionIds: Types.ObjectId[] | null = null;
  if (userCourseRole === COURSE_ROLE.TA) {
    const myTasks = await PeerReviewGradingTaskModel.find({
      peerReviewId: peerReview._id,
      grader: oid(userId),
      peerReviewSubmissionId: { $exists: true },
    })
      .select('peerReviewSubmissionId')
      .lean();

    const ids = myTasks
      .map(t => t.peerReviewSubmissionId)
      .filter(Boolean) as Types.ObjectId[];

    // If TA has no tasks, they see nothing (empty list)
    allowedSubmissionIds = ids.length ? ids : [];
  }

  const submissions = await PeerReviewSubmissionModel.find({
    peerReviewId: peerReview._id,
    ...(allowedSubmissionIds ? { _id: { $in: allowedSubmissionIds } } : {}),
  }).lean();
  
  if (userCourseRole === COURSE_ROLE.TA && submissions.length === 0) {
    return {
      internalAssessmentId: String(assessment._id),
      peerReviewId: String(peerReview._id),
      reviewerType: peerReview.reviewerType,
      taAssignments: peerReview.taAssignments,
      maxMarks: assessment.maxMarks ?? 0,
      items: [],
    };
  }
  
  // Load assignments + reviewee team numbers + repo
  const assignmentIds = Array.from(new Set(submissions.map(s => String(s.peerReviewAssignmentId)))).map(oid);
  const assignments = await PeerReviewAssignmentModel.find({
    _id: { $in: assignmentIds },
  })
    .select('_id reviewee repoName repoUrl')
    .lean();

  const assignmentById = new Map(assignments.map(a => [String(a._id), a]));
  const revieweeTeamIds = Array.from(new Set(assignments.map(a => String(a.reviewee)))).map(oid);
  const revieweeTeams = await TeamModel.find({ _id: { $in: revieweeTeamIds } })
    .select('_id number')
    .lean();
  const teamNumberById = new Map(revieweeTeams.map(t => [String(t._id), t.number]));

  // Reviewer lookups
  const reviewerUserIds = Array.from(
    new Set(
      submissions
        .filter(s => s.reviewerUserId)
        .map(s => String(s.reviewerUserId))
    )
  ).map(oid);

  const reviewerTeamIds = Array.from(
    new Set(
      submissions
        .filter(s => s.reviewerTeamId)
        .map(s => String(s.reviewerTeamId))
    )
  ).map(oid);

  const [reviewerUsers, reviewerTeams] = await Promise.all([
    reviewerUserIds.length
      ? UserModel.find({ _id: { $in: reviewerUserIds } })
          .select('_id name')
          .lean()
      : Promise.resolve([]),
    reviewerTeamIds.length
      ? TeamModel.find({ _id: { $in: reviewerTeamIds } })
          .select('_id number')
          .lean()
      : Promise.resolve([]),
  ]);

  const userNameById = new Map(reviewerUsers.map(u => [String(u._id), u.name]));
  const reviewerTeamNumberById = new Map(
    reviewerTeams.map(t => [String(t._id), t.number])
  );

  // Grading tasks summary (per submission)
  const subIds = submissions.map(s => s._id);
  const taskQuery: any = {
    peerReviewId: peerReview._id,
    peerReviewSubmissionId: { $in: subIds },
  }
  
  if (userCourseRole === COURSE_ROLE.TA) taskQuery.grader = oid(userId);
  
  const tasks = await PeerReviewGradingTaskModel.find(taskQuery)
    .select('peerReviewSubmissionId grader status gradedAt')
    .populate('grader', '_id name')
    .lean();

  const tasksBySubmissionId = new Map<string, any[]>();
  for (const t of tasks) {
    const sid = String(t.peerReviewSubmissionId);
    const arr = tasksBySubmissionId.get(sid) ?? [];
    arr.push(t);
    tasksBySubmissionId.set(sid, arr);
  }

  const items: PeerReviewSubmissionListItemDTO[] = submissions.map(s => {
    const assignment = assignmentById.get(String(s.peerReviewAssignmentId));
    const revieweeTeamId = assignment ? String(assignment.reviewee) : '';
    const revieweeTeamNumber = teamNumberById.get(revieweeTeamId) ?? -1;

    const reviewer: ReviewerRef =
      s.reviewerKind === 'Team' && s.reviewerTeamId
        ? {
            kind: 'Team',
            teamId: String(s.reviewerTeamId),
            teamNumber: reviewerTeamNumberById.get(String(s.reviewerTeamId)) ?? -1,
          }
        : {
            kind: 'User',
            userId: String(s.reviewerUserId ?? ''),
            name: userNameById.get(String(s.reviewerUserId ?? '')) ?? 'Unknown',
          };

    const ts = tasksBySubmissionId.get(String(s._id)) ?? [];
    const gradersMap = new Map<string, { id: string; name: string }>();
    let lastGradedAt: Date | undefined = undefined;
    let completedCount = 0;
    let inProgressCount = 0;
    let assignedCount = 0;

    for (const t of ts) {
      const g = t.grader as any;
      if (g?._id) gradersMap.set(String(g._id), { id: String(g._id), name: g.name });
      if (t.status === 'Completed') completedCount++;
      else if (t.status === 'InProgress') inProgressCount++;
      else assignedCount++;

      if (t.gradedAt) {
        const d = new Date(t.gradedAt);
        if (!lastGradedAt || d > lastGradedAt) lastGradedAt = d;
      }
    }

    return {
      peerReviewId: String(s.peerReviewId),
      peerReviewSubmissionId: String(s._id),
      peerReviewAssignmentId: String(s.peerReviewAssignmentId),
      internalAssessmentId: String(peerReview.internalAssessmentId),

      revieweeTeam: { teamId: revieweeTeamId, teamNumber: revieweeTeamNumber },
      repo: { repoName: assignment?.repoName ?? '', repoUrl: assignment?.repoUrl ?? '' },

      reviewer,
      reviewerKind: s.reviewerKind,

      status: s.status,
      startedAt: s.startedAt,
      lastEditedAt: s.lastEditedAt,
      submittedAt: s.submittedAt,
      createdAt: s.createdAt,

      lastActivityAt: lastActivityAt(s),

      grading: {
        count: ts.length,
        completedCount,
        inProgressCount,
        assignedCount,
        graders: Array.from(gradersMap.values()).sort((a,b) => a.name.localeCompare(b.name)),
        lastGradedAt,
      },
    };
  });

  // Sort most recent activity first
  items.sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());

  return {
    internalAssessmentId: String(assessment._id),
    peerReviewId: String(peerReview._id),
    reviewerType: peerReview.reviewerType,
    taAssignments: peerReview.taAssignments,
    maxMarks: assessment.maxMarks ?? 0,
    items,
  };
};

/* ------------------------------- Peer Review Assessment Results ------------------------------- */

const avgOrNull = (xs: number[]) => xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Computes peer review results from PeerReviewSubmission + PeerReviewGradingTask,
 * RETURNS DTO for UI, and PERSISTS per-student published score into AssessmentResult.averageScore.
 */
export const getPeerReviewResultsForAssessmentById = async (
  assessmentId: string,
): Promise<PeerReviewResultsDTO> => {
  const assessment = await InternalAssessmentModel.findById(assessmentId)
    .select('_id assessmentType maxMarks teamSet results')
    .lean();

  if (!assessment) throw new NotFoundError('Assessment not found');
  if (assessment.assessmentType !== 'peer_review')
    throw new BadRequestError('Not a peer review assessment');
  if (!assessment.teamSet) throw new BadRequestError('Peer review assessment missing teamSet');

  const peerReview = await PeerReviewModel.findOne({
    internalAssessmentId: assessmentId,
  })
    .select('_id reviewerType internalAssessmentId')
    .lean();

  if (!peerReview) throw new NotFoundError('Peer review not found for assessment');

  // Load team set with teams + members (names for DTO)
  const teamSet = await TeamSetModel.findById(assessment.teamSet)
    .populate({
      path: 'teams',
      model: 'Team',
      populate: { path: 'members', model: 'User' },
    })
    .lean() as any;

  if (!teamSet) throw new NotFoundError('Team set not found');

  const teams: any[] = teamSet.teams ?? [];

  // Build membership maps
  const studentToTeam = new Map<
    string,
    { teamId: string; teamNumber: number; studentName: string }
  >();
  const teamToMembers = new Map<
    string,
    Array<{ studentId: string; studentName: string }>
  >();

  for (const t of teams) {
    const tid = String(t._id);
    const members = (t.members ?? []).map((m: any) => ({
      studentId: String(m._id),
      studentName: m.name ?? 'Unknown',
    }));
    teamToMembers.set(tid, members);
    for (const m of members) {
      studentToTeam.set(m.studentId, {
        teamId: tid,
        teamNumber: t.number,
        studentName: m.studentName,
      });
    }
  }

  // Load peer review submissions (exclude TA reviewers from student results)
  const submissions = await PeerReviewSubmissionModel.find({
    peerReviewId: oid(String(peerReview._id)),
    reviewerKind: { $in: ['Student', 'Team'] },
  })
    .select('_id reviewerKind reviewerUserId reviewerTeamId')
    .lean();

  const submissionIds = submissions.map(s => s._id);

  // Load completed grading tasks with scores
  const tasks = await PeerReviewGradingTaskModel.find({
    peerReviewId: oid(String(peerReview._id)),
    peerReviewSubmissionId: { $in: submissionIds },
    status: 'Completed',
    score: { $ne: null },
  })
    .select('peerReviewSubmissionId score')
    .lean();

  // submissionId -> [scores]
  const scoresBySubmission = new Map<string, number[]>();
  for (const t of tasks) {
    if (!t.peerReviewSubmissionId) continue;
    const sid = String(t.peerReviewSubmissionId);
    const arr = scoresBySubmission.get(sid) ?? [];
    arr.push(Number(t.score));
    scoresBySubmission.set(sid, arr);
  }

  // reviewerKey -> [submissionGrade]
  const gradesByReviewer = new Map<string, number[]>();
  for (const s of submissions) {
    const sid = String(s._id);
    const submissionGrade = avgOrNull(scoresBySubmission.get(sid) ?? []);
    if (submissionGrade === null) continue; // ignore ungraded submissions

    const reviewerKey =
      s.reviewerKind === 'Team'
        ? `T:${String(s.reviewerTeamId)}`
        : `U:${String(s.reviewerUserId)}`;

    const arr = gradesByReviewer.get(reviewerKey) ?? [];
    arr.push(submissionGrade);
    gradesByReviewer.set(reviewerKey, arr);
  }

  // reviewerKey -> aggregated reviewer score
  const aggregatedByReviewer = new Map<string, number | null>();
  for (const [k, xs] of gradesByReviewer.entries()) {
    aggregatedByReviewer.set(k, avgOrNull(xs));
  }

  // Build per-student DTO rows for ALL students in the team set
  const perStudent: PeerReviewResultsStudentRow[] = [];

  for (const [studentId, info] of studentToTeam.entries()) {
    let aggregatedScore: number | null = null;

    if (peerReview.reviewerType === 'Individual') {
      aggregatedScore = aggregatedByReviewer.get(`U:${studentId}`) ?? null;
    } else {
      aggregatedScore = aggregatedByReviewer.get(`T:${info.teamId}`) ?? null;
    }

    perStudent.push({
      studentId,
      studentName: info.studentName,
      teamId: info.teamId,
      teamNumber: info.teamNumber,
      aggregatedScore,
    });
  }

  // Build per-team cards (derive team score from graded members only)
  const perTeam: PeerReviewResultsTeamCard[] = teams.map(t => {
    const tid = String(t._id);
    const members = (teamToMembers.get(tid) ?? []).map(m => {
      const row = perStudent.find(r => r.studentId === m.studentId);
      return {
        studentId: m.studentId,
        studentName: m.studentName,
        aggregatedScore: row?.aggregatedScore ?? null,
      };
    });

    const gradedScores = members
      .map(m => m.aggregatedScore)
      .filter((x): x is number => typeof x === 'number');

    return {
      teamId: tid,
      teamNumber: t.number,
      teamAggregatedScore: avgOrNull(gradedScores),
      members,
    };
  });

  // Sort for stable UI
  perStudent.sort(
    (a, b) => a.teamNumber - b.teamNumber || a.studentName.localeCompare(b.studentName)
  );
  perTeam.sort((a, b) => a.teamNumber - b.teamNumber);

  const dto: PeerReviewResultsDTO = {
    internalAssessmentId: String(assessment._id),
    peerReviewId: String(peerReview._id),
    reviewerType: peerReview.reviewerType,
    maxMarks: Number(assessment.maxMarks ?? 0),
    perStudent,
    perTeam,
  };

  // persist to AssessmentResult.averageScore
  // store 0 for ungraded because schema doesn't allow null
  const bulkOps = perStudent.map(r => ({
    updateOne: {
      filter: { assessment: oid(assessmentId), student: oid(r.studentId) },
      update: { $set: { averageScore: r.aggregatedScore ?? 0 } },
    },
  }));

  if (bulkOps.length > 0) {
    await AssessmentResultModel.bulkWrite(bulkOps, { ordered: false });
  }

  return dto;
};

/* ------------------------------- Peer Review Assessment Grading ------------------------------- */

export const getPeerReviewGradingDTO = async (
  userId: string,
  userCourseRole: string,
  assessmentId: string,
  peerReviewSubmissionId: string
) => {
  const assessment = await InternalAssessmentModel.findById(assessmentId)
    .select('_id assessmentType maxMarks')
    .lean();
  if (!assessment) throw new NotFoundError('Assessment not found');
  if (assessment.assessmentType !== 'peer_review')
    throw new BadRequestError('Not a peer review assessment');

  const peerReview = await PeerReviewModel.findOne({ internalAssessmentId: assessmentId })
    .select('_id title reviewerType internalAssessmentId')
    .lean();
  if (!peerReview) throw new NotFoundError('Peer review not found for assessment');

  const submission = await PeerReviewSubmissionModel.findById(peerReviewSubmissionId)
    .select('_id peerReviewId peerReviewAssignmentId reviewerKind reviewerUserId reviewerTeamId status startedAt lastEditedAt submittedAt createdAt')
    .lean();
  if (!submission) throw new NotFoundError('Peer review submission not found');

  if (String(submission.peerReviewId) !== String(peerReview._id)) {
    throw new BadRequestError('Submission does not belong to this peer review assessment');
  }

  // TA must be assigned a grading task
  let myTaskDoc: any | null = null;
  if (userCourseRole === COURSE_ROLE.TA) {
    myTaskDoc = await PeerReviewGradingTaskModel.findOne({
      peerReviewId: peerReview._id,
      peerReviewSubmissionId: submission._id,
      grader: oid(userId),
    }).lean();

    if (!myTaskDoc) {
      throw new MissingAuthorizationError('Not assigned to grade this submission');
    }
  } else if (userCourseRole === COURSE_ROLE.Faculty) {
    myTaskDoc = await PeerReviewGradingTaskModel.findOne({
      peerReviewId: peerReview._id,
      peerReviewSubmissionId: submission._id,
      grader: oid(userId),
    }).lean();
  } else {
    throw new MissingAuthorizationError('Access denied');
  }

  const assignment = await PeerReviewAssignmentModel.findById(submission.peerReviewAssignmentId)
    .select('_id reviewee repoName repoUrl')
    .lean();
  if (!assignment) throw new NotFoundError('Peer review assignment not found');

  const revieweeTeam = await TeamModel.findById(assignment.reviewee)
    .select('_id number')
    .lean();
  if (!revieweeTeam) throw new NotFoundError('Reviewee team not found');

  // reviewer identity
  let reviewer:
    | { kind: 'Team'; teamId: string; teamNumber: number; reviewerKind: 'Team' }
    | { kind: 'User'; userId: string; name: string; reviewerKind: 'Student' | 'TA' };

  if (submission.reviewerKind === 'Team') {
    const team = await TeamModel.findById(submission.reviewerTeamId).select('_id number').lean();
    reviewer = {
      kind: 'Team',
      teamId: String(submission.reviewerTeamId),
      teamNumber: team?.number ?? -1,
      reviewerKind: 'Team',
    };
  } else {
    const u = await UserModel.findById(submission.reviewerUserId).select('_id name').lean();
    reviewer = {
      kind: 'User',
      userId: String(submission.reviewerUserId),
      name: u?.name ?? 'Unknown',
      reviewerKind: submission.reviewerKind as 'Student' | 'TA',
    };
  }

  // Retrieve comments
  const comments = await getPeerReviewCommentsBySubmissionId(
    userId,
    userCourseRole,
    assessmentId,
    peerReviewSubmissionId
  );

  const myGradingTask: PeerReviewMyGradingTaskDTO | null = myTaskDoc
    ? {
        _id: String(myTaskDoc._id),
        status: myTaskDoc.status,
        score: myTaskDoc.score,
        feedback: myTaskDoc.feedback,
        gradedAt: myTaskDoc.gradedAt,
        createdAt: myTaskDoc.createdAt,
        updatedAt: myTaskDoc.updatedAt,
      }
    : null;

  return {
    internalAssessmentId: String(assessment._id),
    peerReviewId: String(peerReview._id),
    peerReviewSubmissionId: String(submission._id),

    maxMarks: Number(assessment.maxMarks ?? 0),

    peerReviewTitle: peerReview.title,
    reviewerType: peerReview.reviewerType,

    submission: {
      status: submission.status,
      startedAt: submission.startedAt,
      lastEditedAt: submission.lastEditedAt,
      submittedAt: submission.submittedAt,
      createdAt: submission.createdAt,
    },

    reviewer,

    assignment: {
      peerReviewAssignmentId: String(assignment._id),
      revieweeTeam: { teamId: String(revieweeTeam._id), teamNumber: revieweeTeam.number },
      repo: { repoName: assignment.repoName, repoUrl: assignment.repoUrl },
    },

    comments,
    myGradingTask,
  };
};
