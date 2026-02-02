import PeerReviewSubmissionModel from '@models/PeerReviewSubmission';
import PeerReviewAssignmentModel from '@models/PeerReviewAssignment';
import { PeerReview } from '@models/PeerReview';
import TeamModel from '@models/Team';
import { getPeerReviewById } from './peerReviewService';
import CourseRole from '@shared/types/auth/CourseRole';
import { BadRequestError, NotFoundError, MissingAuthorizationError } from './errors';
import { Types } from 'mongoose';

const SUBMISSION_NOT_FOUND = 'Peer review submission not found';
const ASSIGNMENT_NOT_FOUND = 'Peer review assignment not found';
const UNAUTHORIZED = 'You are not authorized to access this submission';
const PEER_REVIEW_CLOSED = 'Peer review is closed; submission is not allowed';
const SUBMISSION_ALREADY_SUBMITTED = 'Submission has already been submitted';

type ReviewerKind = 'Student' | 'Team' | 'TA';
type SubmissionStatus = 'NotStarted' | 'Draft' | 'Submitted';

const oid = (s: string) => new Types.ObjectId(s);


// Retrieve submissions for an assignment
export const getSubmissionsByAssignmentId = async (
  userId: string,
  userCourseRole: string,
  peerReviewId: string,
  peerReviewAssignmentId: string
) => {
  const assignment = await fetchAssignment(peerReviewAssignmentId, peerReviewId);
  const peerReview = await getPeerReviewById(peerReviewId);

  // Students can only see their own submission for this assignment
  if (userCourseRole === CourseRole.Student) {
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
    return mine ? [mine] : [];
  }

  // TAs can see their own TA submission and of those they supervise
  if (userCourseRole === CourseRole.TA) {
    const isSupervising = await isTAForAssignmentReviewee(
      userId,
      peerReviewAssignmentId
    );
    
    if (isSupervising) {
      return PeerReviewSubmissionModel.find({
        peerReviewId: oid(peerReview._id.toString()),
        peerReviewAssignmentId: oid(assignment._id.toString()),
      }).lean();
    };
    
    return PeerReviewSubmissionModel.find({
      peerReviewId: oid(peerReview._id.toString()),
      peerReviewAssignmentId: oid(assignment._id.toString()),
      reviewerKind: 'TA',
      reviewerUserId: oid(userId),
    }).lean();
  }

  // Coordinators can view all submissions for this assignment
  if (userCourseRole === CourseRole.Faculty) {
    return PeerReviewSubmissionModel.find({
      peerReviewId: oid(peerReview._id.toString()),
      peerReviewAssignmentId: oid(assignment._id.toString()),
    }).lean();
  }

  throw new MissingAuthorizationError(UNAUTHORIZED);
};

export const updateMySubmissionDraft = async (
  userId: string,
  userCourseRole: string,
  peerReviewId: string,
  assignmentId: string,
) => {
  const assignment = await fetchAssignment(assignmentId, peerReviewId);
  const peerReview = await getPeerReviewById(peerReviewId);
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
  peerReviewId: string,
  assignmentId: string,
) => {
  const assignment = await fetchAssignment(assignmentId, peerReviewId);
  const peerReview = await getPeerReviewById(peerReviewId);
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
  return submission;
};

/* ----- Subfunctions and Helpers ----- */
const fetchAssignment = async(assignmentId: string, peerReviewId: string) => {
  const assignment = await PeerReviewAssignmentModel.findById(
    assignmentId
  );
  if (!assignment || assignment.peerReviewId.toString() !== peerReviewId) throw new NotFoundError(ASSIGNMENT_NOT_FOUND);
  return assignment;
}

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

const assertIsOwnerOfSubmission = async (
  userId: string,
  userCourseRole: string,
  submission: any
): Promise<void> => {
  // Coordinators can view but cannot edit/submit
  if (userCourseRole === CourseRole.Faculty) {
    throw new MissingAuthorizationError(UNAUTHORIZED);
  }

  // TA submission owner
  if (userCourseRole === CourseRole.TA) {
    if (submission.reviewerKind !== 'TA') throw new MissingAuthorizationError(UNAUTHORIZED);
    if (submission.reviewerUserId?.toString() !== userId)
      throw new MissingAuthorizationError(UNAUTHORIZED);
    return;
  }

  // Student submission owner
  if (userCourseRole === CourseRole.Student) {
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
  if (userCourseRole === CourseRole.TA) {
    return { reviewerKind: 'TA', reviewerUserId: userId };
  }

  if (userCourseRole === CourseRole.Student) {
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


