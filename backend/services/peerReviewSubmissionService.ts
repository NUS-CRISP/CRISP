import PeerReviewSubmissionModel from '@models/PeerReviewSubmission';
import PeerReviewAssignmentModel from '@models/PeerReviewAssignment';
import { PeerReview } from '@models/PeerReview';
import TeamModel from '@models/Team';
import { getPeerReviewById } from './peerReviewService';
import { COURSE_ROLE } from '@shared/types/auth/CourseRole';
import { BadRequestError, NotFoundError, MissingAuthorizationError } from './errors';
import { Types } from 'mongoose';

const SUBMISSION_NOT_FOUND = 'Peer review submission not found';
const ASSIGNMENT_NOT_FOUND = 'Peer review assignment not found';
const UNAUTHORIZED = 'You are not authorized to access this submission';
const PEER_REVIEW_CLOSED = 'Peer review is closed; submission is not allowed';
const SUBMISSION_ALREADY_SUBMITTED = 'Submission has already been submitted';
const INVALID_SUBMISSION = 'Invalid submission';
const SUBMISSION_LOCKED = 'Submission has already been submitted';

type ReviewerKind = 'Student' | 'Team' | 'TA';
type SubmissionStatus = 'NotStarted' | 'Draft' | 'Submitted';

const oid = (s: string) => new Types.ObjectId(s);


// Retrieve submissions for an assignment
export const getSubmissionsByAssignmentId = async (
  userId: string,
  userCourseRole: string,
  peerReviewAssignmentId: string
) => {
  const assignment = await fetchAssignment(peerReviewAssignmentId);
  const peerReview = await getPeerReviewById(assignment.peerReviewId.toString());

  // Students can only see their own submission for this assignment
  if (userCourseRole === COURSE_ROLE.Student) {
    const reviewerRef = await resolveReviewerRefForUser(
      userId,
      userCourseRole,
      peerReview.teamSetId.toString(),
      peerReview.reviewerType
    );

    const mine = await findSubmissionByReviewerRef(
      peerReview._id.toString(),
      assignment._id.toString(),
      reviewerRef
    );
    if (!mine) throw new NotFoundError(SUBMISSION_NOT_FOUND);
    return [mine];
  }

  // TAs can see their own TA submission and of those they supervise
  if (userCourseRole === COURSE_ROLE.TA) {
    const isSupervising = await isTAForAssignmentReviewee(
      userId,
      peerReviewAssignmentId
    );
    
    if (isSupervising) {
      const submissions = await PeerReviewSubmissionModel.find({
        peerReviewId: oid(peerReview._id.toString()),
        peerReviewAssignmentId: oid(assignment._id.toString()),
      }).lean();
      if (submissions.length === 0) throw new NotFoundError(SUBMISSION_NOT_FOUND);
      return submissions;
    };
    
    const submission = await PeerReviewSubmissionModel.find({
      peerReviewId: oid(peerReview._id.toString()),
      peerReviewAssignmentId: oid(assignment._id.toString()),
      reviewerKind: 'TA',
      reviewerUserId: oid(userId),
    }).lean();
    
    if (submission.length === 0) throw new NotFoundError(SUBMISSION_NOT_FOUND);
    return submission;
  }

  // Coordinators can view all submissions for this assignment
  if (userCourseRole === COURSE_ROLE.Faculty) {
    const submissions = await PeerReviewSubmissionModel.find({
      peerReviewId: oid(peerReview._id.toString()),
      peerReviewAssignmentId: oid(assignment._id.toString()),
    }).lean();

    if (submissions.length === 0) throw new NotFoundError(SUBMISSION_NOT_FOUND);
    return submissions;
  }

  throw new MissingAuthorizationError(UNAUTHORIZED);
};

export const getMySubmissionForAssignmentId = async (
  userId: string,
  userCourseRole: string,
  assignmentId: string
) => {
  const assignment = await fetchAssignment(assignmentId);
  const peerReview = await getPeerReviewById(assignment.peerReviewId.toString());
  const reviewerRef = await resolveReviewerRefForUser(
    userId,
    userCourseRole,
    peerReview.teamSetId.toString(),
    peerReview.reviewerType
  );
  
  const submission = await findSubmissionByReviewerRef(
    peerReview._id.toString(),
    assignment._id.toString(),
    reviewerRef
  );
  
  if (!submission) throw new NotFoundError(SUBMISSION_NOT_FOUND);
  return submission;
};

export const updateMySubmissionDraft = async (
  userId: string,
  userCourseRole: string,
  assignmentId: string,
) => {
  const assignment = await fetchAssignment(assignmentId);
  const peerReview = await getPeerReviewById(assignment.peerReviewId.toString());
  assertPeerReviewActive(peerReview);
  
  const reviewerRef = await resolveReviewerRefForUser(
    userId,
    userCourseRole,
    peerReview.teamSetId.toString(),
    peerReview.reviewerType
  );

  const submission = await findSubmissionByReviewerRef(
    peerReview._id.toString(),
    assignment._id.toString(),
    reviewerRef
  );
  
  if (!submission) throw new NotFoundError(SUBMISSION_NOT_FOUND);
  await assertIsOwnerOfSubmission(userId, userCourseRole, submission);

  // Cannot edit once submitted
  if (submission.status === 'Submitted') {
    throw new BadRequestError(SUBMISSION_ALREADY_SUBMITTED);
  }

  const now = new Date();
  const nextStatus: SubmissionStatus =
    submission.status === 'NotStarted' ? 'Draft' : submission.status;

  if (!submission.startedAt && submission.status === 'NotStarted') {
    submission.startedAt = now;
  }
  submission.lastEditedAt = now;
  submission.updatedAt = now;

  submission.status = nextStatus;
  await submission.save();
  return submission;
};

export const submitMySubmission = async (
  userId: string,
  userCourseRole: string,
  assignmentId: string,
) => {
  const assignment = await fetchAssignment(assignmentId);
  const peerReview = await getPeerReviewById(assignment.peerReviewId.toString());
  assertPeerReviewActive(peerReview);
  
  const reviewerRef = await resolveReviewerRefForUser(
    userId,
    userCourseRole,
    peerReview.teamSetId.toString(),
    peerReview.reviewerType
  );

  const submission = await findSubmissionByReviewerRef(
    peerReview._id.toString(),
    assignment._id.toString(),
    reviewerRef
  );
  
  if (!submission) throw new NotFoundError(SUBMISSION_NOT_FOUND);
  await assertIsOwnerOfSubmission(userId, userCourseRole, submission);

  if (submission.status === 'Submitted') {
    throw new BadRequestError(SUBMISSION_ALREADY_SUBMITTED);
  }

  const now = new Date();
  if (!submission.startedAt) submission.startedAt = now;
  submission.lastEditedAt = now;
  submission.submittedAt = now;
  submission.updatedAt = now;
  submission.status = 'Submitted';
  await submission.save();
  
  console.log(`submission successful`);
  return submission;
};

/* ----- Subfunctions and Helpers ----- */
const fetchAssignment = async(assignmentId: string) => {
  const assignment = await PeerReviewAssignmentModel.findById(
    assignmentId
  );
  if (!assignment) throw new NotFoundError(ASSIGNMENT_NOT_FOUND);
  return assignment;
}

export const fetchSubmissionForAssignment = async (submissionId: string, assignmentId: string) => {
  if (!Types.ObjectId.isValid(submissionId)) throw new BadRequestError(INVALID_SUBMISSION);

  const submission = await PeerReviewSubmissionModel.findById(submissionId);
  if (!submission) throw new NotFoundError(SUBMISSION_NOT_FOUND);

  if (submission.peerReviewAssignmentId.toString() !== assignmentId) {
    throw new BadRequestError(INVALID_SUBMISSION);
  }

  return submission;
};

const assertPeerReviewActive = (peerReview: PeerReview) => {
  if (peerReview.computedStatus === 'Upcoming' || peerReview.computedStatus === 'Closed')
    throw new BadRequestError(PEER_REVIEW_CLOSED);
}

const assertStudentInReviewerTeam = async (userId: string, teamId: string) => {
  const team = await TeamModel.findById(teamId).select('_id members').lean();
  if (!team) throw new MissingAuthorizationError(UNAUTHORIZED);

  const isMember = (team.members ?? []).map(String).includes(userId);
  if (!isMember) throw new MissingAuthorizationError(UNAUTHORIZED);
};

export const assertSubmissionWritableByCaller = async (
  userId: string,
  userCourseRole: string,
  submission: any,
) => {
  // Coordinators / supervising TAs should not be writing reviewer comments here
  if (userCourseRole === COURSE_ROLE.Faculty) {
    throw new MissingAuthorizationError(UNAUTHORIZED);
  }

  // Lock after submit
  if (submission.status === 'Submitted') {
    throw new BadRequestError(SUBMISSION_LOCKED);
  }

  // TA reviewer: only their own TA submission
  if (userCourseRole === COURSE_ROLE.TA) {
    if (submission.reviewerKind !== 'TA') throw new MissingAuthorizationError(UNAUTHORIZED);
    if (submission.reviewerUserId?.toString() !== userId) throw new MissingAuthorizationError(UNAUTHORIZED);
    return;
  }

  // Student reviewer
  if (userCourseRole === COURSE_ROLE.Student) {
    if (submission.reviewerKind === 'Student') {
      if (submission.reviewerUserId?.toString() !== userId) throw new MissingAuthorizationError(UNAUTHORIZED);
      return;
    }

    if (submission.reviewerKind === 'Team') {
      if (!submission.reviewerTeamId) throw new MissingAuthorizationError(UNAUTHORIZED);
      await assertStudentInReviewerTeam(userId, submission.reviewerTeamId.toString());
      return;
    }
  }

  throw new MissingAuthorizationError(UNAUTHORIZED);
};


const assertIsOwnerOfSubmission = async (
  userId: string,
  userCourseRole: string,
  submission: any
): Promise<void> => {
  // Coordinators can view but cannot edit/submit
  if (userCourseRole === COURSE_ROLE.Faculty) {
    throw new MissingAuthorizationError(UNAUTHORIZED);
  }

  // TA submission owner
  if (userCourseRole === COURSE_ROLE.TA) {
    if (submission.reviewerKind !== 'TA') throw new MissingAuthorizationError(UNAUTHORIZED);
    if (submission.reviewerUserId?.toString() !== userId)
      throw new MissingAuthorizationError(UNAUTHORIZED);
    return;
  }

  // Student submission owner
  if (userCourseRole === COURSE_ROLE.Student) {
    if (submission.reviewerKind === 'Student') {
      if (submission.reviewerUserId?.toString() !== userId)
        throw new MissingAuthorizationError(UNAUTHORIZED);
      return;
    }

    if (submission.reviewerKind === 'Team') {
      if (!submission.reviewerTeamId) throw new MissingAuthorizationError(UNAUTHORIZED);
      await assertStudentInReviewerTeam(userId, submission.reviewerTeamId.toString());
      return;
    }

    // Students should not edit TA submissions
    throw new MissingAuthorizationError(UNAUTHORIZED);
  }

  throw new MissingAuthorizationError(UNAUTHORIZED);
};


const isTAForAssignmentReviewee = async (
  taUserId: string,
  peerReviewAssignmentId: string
) => {
  const assignment = await PeerReviewAssignmentModel.findById(peerReviewAssignmentId)
    .select('_id reviewee')
    .lean();
  if (!assignment) throw new NotFoundError(ASSIGNMENT_NOT_FOUND);

  const revieweeTeam = await TeamModel.findById(assignment.reviewee)
    .select('_id TA')
    .lean();
  if (!revieweeTeam) {
    throw new NotFoundError('Reviewee team not found for this assignment');
  }

  return revieweeTeam.TA?.toString() === taUserId;
};

const resolveReviewerRefForUser = async (
  userId: string,
  userCourseRole: string,
  teamSetId: string,
  reviewerType: 'Individual' | 'Team'
): Promise<
  | { reviewerKind: 'TA'; reviewerUserId: string }
  | { reviewerKind: 'Student'; reviewerUserId: string }
  | { reviewerKind: 'Team'; reviewerTeamId: string }
> => {
  if (userCourseRole === COURSE_ROLE.TA) {
    return { reviewerKind: 'TA', reviewerUserId: userId };
  }

  if (userCourseRole === COURSE_ROLE.Student) {
    if (reviewerType === 'Individual') {
      return { reviewerKind: 'Student', reviewerUserId: userId };
    }

    const myTeam = await TeamModel.findOne({
      teamSet: oid(teamSetId),
      members: oid(userId),
    })
      .select('_id')
      .lean();

    if (!myTeam) throw new MissingAuthorizationError(UNAUTHORIZED);
    return { reviewerKind: 'Team', reviewerTeamId: myTeam._id.toString() };
  }

  throw new MissingAuthorizationError(UNAUTHORIZED);
};

const findSubmissionByReviewerRef = async (
  peerReviewId: string,
  assignmentId: string,
  ref:
    | { reviewerKind: 'TA'; reviewerUserId: string }
    | { reviewerKind: 'Student'; reviewerUserId: string }
    | { reviewerKind: 'Team'; reviewerTeamId: string }
) => {
  const base = {
    peerReviewId: oid(peerReviewId),
    peerReviewAssignmentId: oid(assignmentId),
    reviewerKind: ref.reviewerKind,
  } as any;

  if (ref.reviewerKind === 'Team') {
    base.reviewerTeamId = oid(ref.reviewerTeamId);
  } else {
    base.reviewerUserId = oid(ref.reviewerUserId);
  }

  return PeerReviewSubmissionModel.findOne(base);
};


