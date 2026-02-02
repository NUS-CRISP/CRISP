import PeerReviewAssignmentModel from '@models/PeerReviewAssignment';
import PeerReviewCommentModel from '@models/PeerReviewComment';
import PeerReviewSubmissionModel from '@models/PeerReviewSubmission';
import TeamModel from '@models/Team';
import { Types } from 'mongoose';
import {
  BadRequestError,
  NotFoundError,
  MissingAuthorizationError,
} from './errors';
import { COURSE_ROLE } from '@shared/types/auth/CourseRole';
import { PeerReview } from '@models/PeerReview';
import { getPeerReviewById } from './peerReviewService';

const ASSIGNMENT_NOT_FOUND = 'Peer review assignment not found';
const COMMENT_NOT_FOUND = 'Peer review comment not found';
const UNAUTHORIZED_TO_VIEW_COMMENTS =
  'You are not authorized to see comments for this assignment';
const UNAUTHORIZED_TO_ADD_COMMENTS =
  'You are not authorized to add comments for this assignment';
const UNAUTHORIZED_TO_UPDATE_COMMENTS =
  'You are not authorized to update comments for this assignment';
const UNAUTHORIZED_TO_DELETE_COMMENTS =
  'You are not authorized to delete comments for this assignment';
const UNAUTHORIZED_TO_FLAG_COMMENTS =
  'You are not authorized to flag comments for this assignment';
const COMMENTS_LOCKED = 'Peer review is closed. Comments are locked.';

const oid = (s: string) => new Types.ObjectId(s);

export const getPeerReviewCommentsByAssignmentId = async (
  userId: string,
  userCourseRole: string,
  assignmentId: string
) => {
  const assignment = await fetchAssignment(assignmentId);
  const peerReview = await getPeerReviewById(assignment.peerReviewId.toString());
  const reviewee = await fetchReviewee(assignment.reviewee.toString());
  
  // Course coordinators can view all comments
  if (userCourseRole === COURSE_ROLE.Faculty) {
    return findCommentsVisible(assignmentId);
  }

  // Students can only view their own comments in their own assignments and own team repository
  if (userCourseRole === COURSE_ROLE.Student) {
    const isReviewee = reviewee.members?.map(String).includes(userId);
    if (isReviewee)
      return findCommentsAnonymous(assignmentId);
    
    const submission = await findSubmissionForUserOnAssignment(
      userId,
      userCourseRole,
      assignment.peerReviewId.toString(),
      assignmentId,
      peerReview.reviewerType,
      peerReview.teamSetId.toString()
    );
    
    if (submission) {
      return findMyCommentsVisible(assignmentId, userId);
    }
  }

  // TAs: see all comments for supervising teams, only own comments for reviewing teams
  if (userCourseRole === COURSE_ROLE.TA) {
    const isSupervisingTA = reviewee.TA?.toString() === userId;
    if (isSupervisingTA)
      return findCommentsVisible(assignmentId);
      
    const submission = await findSubmissionForUserOnAssignment(
      userId,
      userCourseRole,
      assignment.peerReviewId.toString(),
      assignmentId,
      peerReview.reviewerType,
      peerReview.teamSetId.toString()
    );
    
    if (submission) {
      return findMyCommentsVisible(assignmentId, userId);
    }
  }
  throw new MissingAuthorizationError(UNAUTHORIZED_TO_VIEW_COMMENTS);
};

export const addPeerReviewCommentByAssignmentId = async (
  userId: string,
  userCourseRole: string,
  assignmentId: string,
  commentData: any
) => {
  const assignment = await fetchAssignment(assignmentId);
  const peerReview = await getPeerReviewById(assignment.peerReviewId.toString());
  assertPeerReviewNotClosed(peerReview);
  const reviewee = await fetchReviewee(assignment.reviewee.toString());
  
  // Parse data
  const { filePath, startLine, endLine, comment, isOverallComment } =
    commentData;

  // Validate comment data
  if (!comment || comment.trim().length === 0) {
    throw new BadRequestError('Comment text cannot be empty');
  } else if (startLine < 1 || endLine < 1) {
    throw new BadRequestError('Line numbers must be >= 1');
  } else if (commentData.startLine > commentData.endLine) {
    throw new BadRequestError('Start line cannot be greater than end line');
  }
  
  const submissionId = await resolveSubmissionIdForComment(
    userId,
    userCourseRole,
    assignmentId,
    assignment.peerReviewId.toString(),
    peerReview.reviewerType,
    peerReview.teamSetId.toString(),
    reviewee,
  )

  const newComment = new PeerReviewCommentModel({
    peerReviewId: assignment.peerReviewId,
    peerReviewAssignmentId: assignmentId,
    peerReviewSubmissionId: submissionId,
    createdAt: Date.now(),
    filePath,
    startLine,
    endLine,
    comment,
    authorId: userId,
    authorCourseRole: userCourseRole,
  });

  await newComment.save();
  return newComment;
};

export const updatePeerReviewCommentById = async (
  userId: string,
  commentId: string,
  updatedComment: string
) => {
  const comment = await PeerReviewCommentModel.findById(commentId);
  if (!comment) throw new NotFoundError(COMMENT_NOT_FOUND);
  const peerReview = await getPeerReviewById(comment.peerReviewId.toString());
  assertPeerReviewNotClosed(peerReview);

  // Only can update own comments, no matter the role
  if (userId !== comment.authorId.toString()) {
    throw new MissingAuthorizationError(UNAUTHORIZED_TO_UPDATE_COMMENTS);
  }

  comment.comment = updatedComment;
  comment.updatedAt = new Date();
  await comment.save();
  return;
};

export const deletePeerReviewCommentById = async (
  userId: string,
  userCourseRole: string,
  commentId: string
) => {
  const comment = await PeerReviewCommentModel.findById(commentId);
  if (!comment) throw new NotFoundError(COMMENT_NOT_FOUND);
  const peerReview = await getPeerReviewById(comment.peerReviewId.toString());
  assertPeerReviewNotClosed(peerReview);
  const assignment = await fetchAssignment(comment.peerReviewAssignmentId.toString());
  const reviewee = await fetchReviewee(assignment.reviewee.toString());
  
  // If student, can only delete own comments
  if (userCourseRole === COURSE_ROLE.Student) {
    if (userId !== comment.authorId.toString())
      throw new MissingAuthorizationError(UNAUTHORIZED_TO_DELETE_COMMENTS);
    return await PeerReviewCommentModel.deleteOne({ _id: commentId });
  }

  // If TA, can only delete own comments or comments on teams they are supervising
  if (userCourseRole === COURSE_ROLE.TA) {
    const isReviewer = userId === comment.authorId.toString();
    const isSupervisingTA = reviewee.TA?.toString() === userId;

    if (isReviewer || isSupervisingTA) {
      return await PeerReviewCommentModel.deleteOne({ _id: commentId });
    }
    throw new MissingAuthorizationError(UNAUTHORIZED_TO_DELETE_COMMENTS);
  }

  // Course coordinators can delete any comment
  if (userCourseRole === COURSE_ROLE.Faculty) {
    return await PeerReviewCommentModel.deleteOne({ _id: commentId });
  }

  throw new MissingAuthorizationError(UNAUTHORIZED_TO_DELETE_COMMENTS);
};

export const flagPeerReviewCommentById = async (
  userId: string,
  userCourseRole: string,
  commentId: string,
  flagStatus: boolean,
  flagReason?: string,
) => {
  const comment = await PeerReviewCommentModel.findById(commentId);
  if (!comment) throw new NotFoundError(COMMENT_NOT_FOUND);
  
  const assignment = await PeerReviewAssignmentModel.findById(
    comment.peerReviewAssignmentId
  );
  if (!assignment) {
    throw new NotFoundError(
      'Peer review assignment not found for this comment'
    );
  }
  
  const reviewee = await fetchReviewee(assignment.reviewee.toString());

  // If TA, can only flag comments of teams they are supervising
  if (userCourseRole === COURSE_ROLE.TA) {
    const isSupervisingTA = reviewee.TA?.toString() === userId;
    if (!isSupervisingTA) {
      throw new MissingAuthorizationError(UNAUTHORIZED_TO_FLAG_COMMENTS);
    }
    comment.isFlagged = flagStatus;
    comment.flagReason = flagReason;
    comment.flaggedAt = new Date();
    comment.flaggedBy = oid(userId);
    await comment.save();
    return;
  }

  // Course coordinators can flag any comment
  if (userCourseRole === COURSE_ROLE.Faculty) {
    comment.isFlagged = flagStatus;
    comment.flagReason = flagReason;
    comment.flaggedAt = new Date();
    comment.flaggedBy = oid(userId);
    await comment.save();
    return;
  }

  throw new MissingAuthorizationError(UNAUTHORIZED_TO_FLAG_COMMENTS);
}

// Helpers
const fetchAssignment = async (assignmentId: string) => {
  const assignment = await PeerReviewAssignmentModel.findById(assignmentId);
  if (!assignment) throw new NotFoundError(ASSIGNMENT_NOT_FOUND);
  return assignment;
};

const fetchReviewee = async (teamId: string) => {
  const team = await TeamModel.findById(teamId);
  if (!team) throw new NotFoundError('Reviewee team not found for this assignment');
  return team;
};

const findCommentsAnonymous = async (assignmentId: string) => {
  return PeerReviewCommentModel.find({ peerReviewAssignmentId: assignmentId })
    .select('-authorId -flaggedBy') // hide identity
    .lean();
};

const findCommentsVisible = async (assignmentId: string) => {
  return PeerReviewCommentModel.find({ peerReviewAssignmentId: assignmentId })
    .populate('authorId', 'name')
    .lean();
};

const findMyCommentsVisible = async (assignmentId: string, userId: string) => {
  return PeerReviewCommentModel.find({
    peerReviewAssignmentId: assignmentId,
    authorId: userId,
  })
    .populate('authorId', 'name')
    .lean();
};

const assertPeerReviewNotClosed = (peerReview: PeerReview) => {
  const status = peerReview.status;
  if (status === 'Closed') {
    throw new BadRequestError(COMMENTS_LOCKED);
  }
};

// Find the submission that represents "this user is a reviewer for this assignment".
const findSubmissionForUserOnAssignment = async (
  userId: string,
  userCourseRole: string,
  peerReviewId: string,
  assignmentId: string,
  reviewerType: 'Individual' | 'Team',
  teamSetId: string,
) => {
  if (userCourseRole === COURSE_ROLE.Student) {
    if (reviewerType === 'Individual') {
      return PeerReviewSubmissionModel.findOne({
        peerReviewId,
        peerReviewAssignmentId: assignmentId,
        reviewerKind: 'Student',
        reviewerUserId: userId,
      }).select('_id reviewerKind reviewerUserId reviewerTeamId');
    }

    // Team reviewer mode: submission belongs to student's home team
    const homeTeam = await TeamModel.findOne({
      teamSet: teamSetId,
      members: userId,
    })
      .select('_id')
      .lean();

    if (!homeTeam) return null;

    return PeerReviewSubmissionModel.findOne({
      peerReviewId,
      peerReviewAssignmentId: assignmentId,
      reviewerKind: 'Team',
      reviewerTeamId: homeTeam._id.toString(),
    }).select('_id reviewerKind reviewerUserId reviewerTeamId');
  }

  if (userCourseRole === COURSE_ROLE.TA) {
    return PeerReviewSubmissionModel.findOne({
      peerReviewId,
      peerReviewAssignmentId: assignmentId,
      reviewerKind: 'TA',
      reviewerUserId: userId,
    }).select('_id reviewerKind reviewerUserId reviewerTeamId');
  }

  // Faculty doesn't "need" a submission to view
  return null;
};

// Resolves which submissionId to attach a comment to
const resolveSubmissionIdForComment = async (
  userId: string,
  userCourseRole: string,
  assignmentId: string,
  peerReviewId: string,
  reviewerType: 'Individual' | 'Team',
  teamSetId: string,
  revieweeTeam: any,
) => {
  // Students must be reviewers (via submission)
  if (userCourseRole === COURSE_ROLE.Student) {
    const submission = await findSubmissionForUserOnAssignment(
      userId,
      userCourseRole,
      peerReviewId,
      assignmentId,
      reviewerType,
      teamSetId
    );
    if (!submission) throw new MissingAuthorizationError(UNAUTHORIZED_TO_ADD_COMMENTS);
    return submission._id;
  }

  // TA: reviewer OR supervising TA (supervising gets auto-upsert submission)
  if (userCourseRole === COURSE_ROLE.TA) {
    const existing = await findSubmissionForUserOnAssignment(
      userId,
      userCourseRole,
      peerReviewId,
      assignmentId,
      reviewerType,
      teamSetId
    );
    if (existing) return existing._id;

    const isSupervisingTA = revieweeTeam.TA?.toString() === userId;
    if (!isSupervisingTA) {
      throw new MissingAuthorizationError(UNAUTHORIZED_TO_ADD_COMMENTS);
    }

    const taSubmission = await upsertTASubmission(peerReviewId, assignmentId, userId);
    return taSubmission._id;
  }

  // Faculty: allow commenting; upsert a submission record so schema is satisfied
  if (userCourseRole === COURSE_ROLE.Faculty) {
    const facultySubmission = await upsertFacultySubmission(peerReviewId, assignmentId, userId);
    return facultySubmission._id;
  }

  throw new MissingAuthorizationError(UNAUTHORIZED_TO_ADD_COMMENTS);
};

const upsertTASubmission = async (peerReviewId: string, assignmentId: string, userId: string) => {
  return PeerReviewSubmissionModel.findOneAndUpdate(
    {
      peerReviewId,
      peerReviewAssignmentId: assignmentId,
      reviewerKind: 'TA',
      reviewerUserId: userId,
    },
    {
      $setOnInsert: {
        peerReviewId,
        peerReviewAssignmentId: assignmentId,
        reviewerKind: 'TA',
        reviewerUserId: userId,
        createdAt: new Date(),
        status: 'Draft',
        startedAt: new Date(),
        lastEditedAt: new Date(),
        scores: {},
      },
      $set: {
        lastEditedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );
};

const upsertFacultySubmission = async (peerReviewId: string, assignmentId: string, userId: string) => {
  // If you prefer to forbid faculty from adding comments, replace this with throw.
  return PeerReviewSubmissionModel.findOneAndUpdate(
    {
      peerReviewId,
      peerReviewAssignmentId: assignmentId,
      reviewerKind: 'TA', // or introduce 'Faculty' kind later
      reviewerUserId: userId,
    },
    {
      $setOnInsert: {
        peerReviewId,
        peerReviewAssignmentId: assignmentId,
        reviewerKind: 'TA',
        reviewerUserId: userId,
        createdAt: new Date(),
        status: 'Draft',
        startedAt: new Date(),
        lastEditedAt: new Date(),
        scores: {},
      },
      $set: {
        lastEditedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );
};
