import PeerReviewAssignmentModel from '@models/PeerReviewAssignment';
import PeerReviewCommentModel from '@models/PeerReviewComment';
import TeamModel, { Team } from '@models/Team';
import {
  BadRequestError,
  NotFoundError,
  MissingAuthorizationError,
} from './errors';
import { COURSE_ROLE } from '@shared/types/auth/CourseRole';

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

export const getPeerReviewCommentsByAssignmentId = async (
  userId: string,
  userCourseRole: string,
  assignmentId: string
) => {
  const assignment = await PeerReviewAssignmentModel.findById(assignmentId);
  if (!assignment) throw new NotFoundError(ASSIGNMENT_NOT_FOUND);
  const revieweeTeam = await TeamModel.findById(assignment.reviewee);
  if (!revieweeTeam)
    throw new NotFoundError('Reviewee team not found for this assignment');

  // Students can only view their own comments in their own assignments and own team repository
  if (userCourseRole === COURSE_ROLE.Student) {
    const isReviewee = revieweeTeam.members?.map(String).includes(userId);
    const isReviewer = assignment.studentReviewers.map(String).includes(userId);

    // Check if student is viewing own team's repository
    if (isReviewee)
      return PeerReviewCommentModel.find({
        peerReviewAssignmentId: assignmentId,
      }).populate('author', 'name');
    if (isReviewer) {
      return PeerReviewCommentModel.find({
        peerReviewAssignmentId: assignmentId,
        author: userId,
      }).populate('author', 'name');
    }
    throw new MissingAuthorizationError(UNAUTHORIZED_TO_VIEW_COMMENTS);
  }

  // TAs can only view comments on teams they are supervising or their own assignments
  if (userCourseRole === COURSE_ROLE.TA) {
    const isReviewer = assignment.taReviewers.map(String).includes(userId);
    const isSupervisingTA = revieweeTeam.TA?.toString() === userId;

    if (isSupervisingTA)
      return PeerReviewCommentModel.find({
        peerReviewAssignmentId: assignmentId,
      }).populate('author', 'name');
    if (isReviewer) {
      return PeerReviewCommentModel.find({
        peerReviewAssignmentId: assignmentId,
        author: userId,
      }).populate('author', 'name');
    }
    throw new MissingAuthorizationError(UNAUTHORIZED_TO_VIEW_COMMENTS);
  }

  // Course coordinators can view all comments
  if (userCourseRole === COURSE_ROLE.Faculty) {
    return PeerReviewCommentModel.find({
      peerReviewAssignmentId: assignmentId,
    }).populate('author', 'name');
  }

  throw new MissingAuthorizationError(UNAUTHORIZED_TO_VIEW_COMMENTS);
};

export const addPeerReviewCommentByAssignmentId = async (
  userId: string,
  userCourseRole: string,
  assignmentId: string,
  commentData: any
) => {
  const assignment = await PeerReviewAssignmentModel.findById(assignmentId);
  if (!assignment) throw new NotFoundError(ASSIGNMENT_NOT_FOUND);

  // If student is not the reviewer user nor part of the reviewer team, they cannot comment
  if (userCourseRole === COURSE_ROLE.Student) {
    const isReviewerUser = assignment.studentReviewers
      .map(String)
      .includes(userId);
    const reviewingTeams = await TeamModel.find({
      _id: { $in: assignment.teamReviewers },
    });
    const isReviewerTeam = reviewingTeams.some((reviewerTeam: Team) =>
      reviewerTeam.members?.map(String).includes(userId)
    );

    if (!isReviewerUser && !isReviewerTeam) {
      throw new MissingAuthorizationError(UNAUTHORIZED_TO_ADD_COMMENTS);
    }
  }

  // If TA is not the reviewer user nor supervising the reviewee team, they cannot comment
  if (userCourseRole === COURSE_ROLE.TA) {
    const isReviewerUser = assignment.taReviewers.map(String).includes(userId);
    const revieweeTeam = await TeamModel.findById(assignment.reviewee);
    const isSupervisingTA =
      revieweeTeam && revieweeTeam.TA!.toString() === userId;

    if (!isReviewerUser && !isSupervisingTA) {
      throw new MissingAuthorizationError(UNAUTHORIZED_TO_ADD_COMMENTS);
    }
  }

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

  const newComment = new PeerReviewCommentModel({
    peerReviewAssignmentId: assignmentId,
    createdAt: Date.now(),
    filePath,
    startLine,
    endLine,
    comment,
    author: userId,
    isOverallComment: isOverallComment || false,
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

  // Only can update own comments, no matter the role
  if (userId !== comment.author.toString()) {
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

  const assignment = await PeerReviewAssignmentModel.findById(
    comment.peerReviewAssignmentId
  );
  if (!assignment) {
    throw new NotFoundError(
      'Peer review assignment not found for this comment'
    );
  }

  console.log('role', userCourseRole);
  console.log('userId', userId);
  console.log('commentId', commentId);
  console.log('comment author', comment.author.toString());

  // If student, can only delete own comments
  if (
    userCourseRole === COURSE_ROLE.Student &&
    userId === comment.author.toString()
  ) {
    const deletedComment = await PeerReviewCommentModel.deleteOne({
      _id: commentId,
    });
    return deletedComment;
  }

  // If TA, can only delete own comments or comments on teams they are supervising
  if (userCourseRole === COURSE_ROLE.TA) {
    const isReviewer = assignment.taReviewers.map(String).includes(userId);

    const revieweeTeam = await TeamModel.findById(assignment.reviewee);
    const isSupervisingTA =
      revieweeTeam && revieweeTeam.TA?.toString() === userId;
    if (isReviewer || isSupervisingTA) {
      const deletedComment = await PeerReviewCommentModel.deleteOne({
        _id: commentId,
      });
      return deletedComment;
    }
  }

  // Course coordinators can delete any comment
  if (userCourseRole === COURSE_ROLE.Faculty) {
    const deletedComment = await PeerReviewCommentModel.deleteOne({
      _id: commentId,
    });
    return deletedComment;
  }

  throw new MissingAuthorizationError(UNAUTHORIZED_TO_DELETE_COMMENTS);
};
