import { Types } from 'mongoose';
import PeerReviewGradingTaskModel from '@models/PeerReviewGradingTask';
import PeerReviewModel from '@models/PeerReview';
import PeerReviewSubmissionModel from '@models/PeerReviewSubmission';
import InternalAssessmentModel from '@models/InternalAssessment';
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
