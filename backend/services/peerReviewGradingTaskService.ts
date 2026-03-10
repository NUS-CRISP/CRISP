import { Types } from 'mongoose';
import PeerReviewGradingTaskModel from '@models/PeerReviewGradingTask';
import PeerReviewModel from '@models/PeerReview';
import PeerReviewSubmissionModel from '@models/PeerReviewSubmission';
import InternalAssessmentModel from '@models/InternalAssessment';
import CourseModel from '@models/Course';
import TeamModel from '@models/Team';
import PeerReviewAssignmentModel from '@models/PeerReviewAssignment';
import { COURSE_ROLE } from '@shared/types/auth/CourseRole';
import {
  BadRequestError,
  NotFoundError,
  MissingAuthorizationError,
} from './errors';

const oid = (s: string) => new Types.ObjectId(s);

const ACCESS_DENIED = 'Access denied';
const TASK_NOT_FOUND = 'Grading task not found';
const NOT_ASSIGNED = 'Not assigned to grade this submission';

const resolvePeerReviewAndSubmission = async (
  assessmentId: string,
  peerReviewSubmissionId: string
) => {
  const assessment = await InternalAssessmentModel.findById(assessmentId)
    .select('_id assessmentType')
    .lean();
  if (!assessment) throw new NotFoundError('Assessment not found');
  if ((assessment as any).assessmentType !== 'peer_review')
    throw new BadRequestError('Not a peer review assessment');

  const peerReview = await PeerReviewModel.findOne({
    internalAssessmentId: assessmentId,
  })
    .select('_id')
    .lean();
  if (!peerReview) throw new NotFoundError('Peer review not found for assessment');

  const submission = await PeerReviewSubmissionModel.findById(peerReviewSubmissionId)
    .select('_id peerReviewId')
    .lean();
  if (!submission) throw new NotFoundError('Peer review submission not found');

  if (String((submission as any).peerReviewId) !== String((peerReview as any)._id)) {
    throw new BadRequestError('Submission does not belong to this peer review');
  }

  return { peerReviewId: (peerReview as any)._id as Types.ObjectId, submissionId: (submission as any)._id as Types.ObjectId };
};

export const startGradingTaskForFacultyById = async (
  userId: string,
  assessmentId: string,
  peerReviewSubmissionId: string,
) => {
  const { peerReviewId, submissionId } = await resolvePeerReviewAndSubmission(
    assessmentId,
    peerReviewSubmissionId
  );

  // Check submission status - can only start grading submitted reviews
  const submission = await PeerReviewSubmissionModel.findById(submissionId)
    .select('status')
    .lean();
  if (!submission) throw new NotFoundError('Submission not found');
  if (submission.status !== 'Submitted') {
    throw new BadRequestError('Cannot start grading for unsubmitted reviews');
  }

  const existing = await PeerReviewGradingTaskModel.findOne({
    peerReviewId,
    peerReviewSubmissionId: submissionId,
    grader: oid(userId),
  });

  if (existing) return existing;

  const created = await new PeerReviewGradingTaskModel({
    peerReviewId,
    peerReviewSubmissionId: submissionId,
    grader: oid(userId),
    status: 'Assigned',
  }).save();

  return created;
};

export const getGradingTaskForSubmissionById = async (
  userId: string,
  userCourseRole: string,
  assessmentId: string,
  peerReviewSubmissionId: string,
) => {
  const { peerReviewId, submissionId } = await resolvePeerReviewAndSubmission(
    assessmentId,
    peerReviewSubmissionId
  );

  const task = await PeerReviewGradingTaskModel.findOne({
    peerReviewId,
    peerReviewSubmissionId: submissionId,
    grader: oid(userId),
  });

  if (userCourseRole === COURSE_ROLE.TA && !task) {
    throw new MissingAuthorizationError(NOT_ASSIGNED);
  }

  return task; // may be null for faculty
};

export const updateGradingTaskById = async (
  userId: string,
  taskId: string,
  patch: { score?: number | null; feedback?: string | null },
) => {
  const task = await PeerReviewGradingTaskModel.findById(taskId);
  if (!task) throw new NotFoundError(TASK_NOT_FOUND);

  // Only the grader can modify their task
  if (String(task.grader) !== String(oid(userId))) {
    throw new MissingAuthorizationError(ACCESS_DENIED);
  }

  // Validate score if provided
  if (patch.score !== undefined && patch.score !== null) {
    const score = Number(patch.score);
    if (!Number.isFinite(score)) throw new BadRequestError('Invalid score');
    if (score < 0) throw new BadRequestError('Score must be >= 0');
    task.score = score;
  } else if (patch.score === null) {
    task.score = undefined;
  }

  if (patch.feedback !== undefined) {
    task.feedback = (patch.feedback ?? '').toString();
  }

  // Move into InProgress when they save something (optional but useful)
  if (task.status === 'Assigned') {
    task.status = 'InProgress';
  }

  await task.save();
  return task;
};

export const submitGradingTaskById = async (
  userId: string,
  taskId: string,
) => {
  const task = await PeerReviewGradingTaskModel.findById(taskId);
  if (!task) throw new NotFoundError(TASK_NOT_FOUND);

  if (String(task.grader) !== String(oid(userId))) {
    throw new MissingAuthorizationError(ACCESS_DENIED);
  }

  // Basic validation: require score on submit (you can relax if needed)
  if (task.score === undefined || task.score === null) {
    throw new BadRequestError('Score is required to submit');
  }

  task.status = 'Completed';
  task.gradedAt = new Date();
  await task.save();
  return task;
};

/* ------------------------------- Bulk Grader Assignment ------------------------------- */

export const bulkAssignGradersByAssessmentId = async (
  courseId: string,
  assessmentId: string,
  numGradersPerSubmission: number,
  allowSupervisingTAs: boolean
) => {
  const assessment = await InternalAssessmentModel.findById(assessmentId)
    .select('_id assessmentType course')
    .lean();
  if (!assessment) throw new NotFoundError('Assessment not found');
  if (assessment.assessmentType !== 'peer_review')
    throw new BadRequestError('Not a peer review assessment');
  if (String(assessment.course) !== courseId)
    throw new BadRequestError('Assessment does not belong to this course');

  const peerReview = await PeerReviewModel.findOne({
    internalAssessmentId: assessmentId,
  })
    .select('_id')
    .lean();
  if (!peerReview) throw new NotFoundError('Peer review not found for assessment');

  // Fetch TAs from course
  const course = await CourseModel.findById(courseId).select('TAs').lean();
  if (!course) throw new NotFoundError('Course not found');

  const TAs = (course.TAs ?? []).map(ta => String(ta));
  if (TAs.length === 0) {
    throw new BadRequestError('No TAs available for grading assignment');
  }

  if (numGradersPerSubmission > TAs.length) {
    throw new BadRequestError(
      `Cannot assign ${numGradersPerSubmission} graders per submission when only ${TAs.length} TAs available`
    );
  }

  // Build TA -> supervisingTeamIds map if needed
  const taSupervisingTeams = new Map<string, Set<string>>();
  if (!allowSupervisingTAs) {
    const teams = await TeamModel.find({ TA: { $in: TAs.map(oid) } })
      .select('_id TA')
      .lean();
    for (const t of teams) {
      if (!t.TA) continue;
      const taId = String(t.TA);
      const teamSet = taSupervisingTeams.get(taId) ?? new Set<string>();
      teamSet.add(String(t._id));
      taSupervisingTeams.set(taId, teamSet);
    }
  }

  // Load all submissions for this peer review (exclude TA reviewers)
  const submissions = await PeerReviewSubmissionModel.find({
    peerReviewId: peerReview._id,
    reviewerKind: { $in: ['Student', 'Team', 'TA'] },
  })
    .select('_id peerReviewAssignmentId reviewerKind reviewerUserId')
    .lean();

  if (submissions.length === 0) {
    throw new BadRequestError('No submissions found for this peer review');
  }

  // Load assignments to get reviewee team IDs
  const assignmentIds = submissions.map(s => s.peerReviewAssignmentId);
  const assignments = await PeerReviewAssignmentModel.find({
    _id: { $in: assignmentIds },
  })
    .select('_id reviewee')
    .lean();

  const assignmentMap = new Map(assignments.map(a => [String(a._id), String(a.reviewee)]));

  // Delete existing grading tasks for this peer review
  await PeerReviewGradingTaskModel.deleteMany({
    peerReviewId: peerReview._id,
  });

  // Round-robin assignment with conflict avoidance
  const tasksToCreate: any[] = [];
  let taIndex = 0;

  for (const submission of submissions) {
    const revieweeTeamId = assignmentMap.get(String(submission.peerReviewAssignmentId));
    const assignedGraders = new Set<string>();

    for (let i = 0; i < numGradersPerSubmission; i++) {
      let attempts = 0;
      let candidateTA: string | null = null;

      while (attempts < TAs.length) {
        const candidate = TAs[taIndex % TAs.length];
        taIndex++;
        attempts++;

        // Skip if already assigned to this submission
        if (assignedGraders.has(candidate)) continue;

        // Never assign a TA to grade their own reviewer submission
        if (
          submission.reviewerKind === 'TA' &&
          submission.reviewerUserId &&
          String(submission.reviewerUserId) === candidate
        ) {
          continue;
        }

        // Check supervisor conflict if needed
        if (!allowSupervisingTAs && revieweeTeamId) {
          const supervisedTeams = taSupervisingTeams.get(candidate);
          if (supervisedTeams?.has(revieweeTeamId)) continue;
        }

        candidateTA = candidate;
        break;
      }

      if (!candidateTA) {
        // Could not find enough eligible TAs for this submission
        throw new BadRequestError(
          `Unable to assign ${numGradersPerSubmission} graders to all submissions with current constraints`
        );
      }

      assignedGraders.add(candidateTA);
      tasksToCreate.push({
        peerReviewId: peerReview._id,
        peerReviewSubmissionId: submission._id,
        grader: oid(candidateTA),
        status: 'Assigned',
      });
    }
  }

  // Bulk insert new tasks
  await PeerReviewGradingTaskModel.insertMany(tasksToCreate);

  return {
    assignedCount: tasksToCreate.length,
    submissionsCount: submissions.length,
  };
};

/* ------------------------------- Manual Grader Assignment ------------------------------- */

export const manualAssignGraderToSubmission = async (
  assessmentId: string,
  submissionId: string,
  graderId: string
) => {
  const { peerReviewId, submissionId: resolvedSubmissionId } =
    await resolvePeerReviewAndSubmission(assessmentId, submissionId);

  const submission = await PeerReviewSubmissionModel.findById(resolvedSubmissionId)
    .select('reviewerKind reviewerUserId')
    .lean();
  if (!submission) {
    throw new NotFoundError('Peer review submission not found');
  }

  if (
    submission.reviewerKind === 'TA' &&
    submission.reviewerUserId &&
    String(submission.reviewerUserId) === graderId
  ) {
    throw new BadRequestError('Cannot assign a TA to grade their own submission');
  }

  // Check if grading task already exists
  const existing = await PeerReviewGradingTaskModel.findOne({
    peerReviewId,
    peerReviewSubmissionId: resolvedSubmissionId,
    grader: oid(graderId),
  });

  if (existing) {
    throw new BadRequestError('Grader already assigned to this submission');
  }

  const created = await new PeerReviewGradingTaskModel({
    peerReviewId,
    peerReviewSubmissionId: resolvedSubmissionId,
    grader: oid(graderId),
    status: 'Assigned',
  }).save();

  return created;
};

export const manualUnassignGraderFromSubmission = async (
  assessmentId: string,
  submissionId: string,
  graderId: string
) => {
  const { peerReviewId, submissionId: resolvedSubmissionId } =
    await resolvePeerReviewAndSubmission(assessmentId, submissionId);

  const task = await PeerReviewGradingTaskModel.findOne({
    peerReviewId,
    peerReviewSubmissionId: resolvedSubmissionId,
    grader: oid(graderId),
  });

  if (!task) {
    throw new NotFoundError('Grading task not found for this grader and submission');
  }

  // Allow deletion of any task status (including Completed ones), FE shows confirmation modal
  await PeerReviewGradingTaskModel.deleteOne({ _id: task._id });

  return { deleted: true };
};
