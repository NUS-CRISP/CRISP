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
import PeerReviewModel, { PeerReview } from '@models/PeerReview';
import { getPeerReviewById } from './peerReviewService';
import {
  fetchSubmissionForAssignment,
  assertSubmissionWritableByCaller,
} from './peerReviewSubmissionService';
import { PeerReviewGradingTaskModel } from '@models/PeerReviewGradingTask';

const ASSIGNMENT_NOT_FOUND = 'Peer review assignment not found';
const COMMENT_NOT_FOUND = 'Peer review comment not found';
const UNAUTHORIZED_TO_VIEW_COMMENTS =
  'You are not authorized to see comments for this assignment';
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
  const peerReview = await getPeerReviewById(
    assignment.peerReviewId.toString()
  );
  const reviewee = await fetchReviewee(assignment.reviewee.toString());

  // Course coordinators can view all comments
  if (userCourseRole === COURSE_ROLE.Faculty) {
    return findCommentsVisible(assignmentId, userId, userCourseRole, true);
  }

  // Students can only view their own comments in their own assignments and own team repository
  if (userCourseRole === COURSE_ROLE.Student) {
    const isReviewee = reviewee.members?.map(String).includes(userId);
    if (isReviewee) return findCommentsAnonymous(assignmentId);

    const submission = await findSubmissionForUserOnAssignment(
      userId,
      userCourseRole,
      assignment.peerReviewId.toString(),
      assignmentId,
      peerReview.reviewerType,
      peerReview.teamSetId.toString()
    );

    if (submission) {
      return findCommentsForSubmissionVisible(
        submission._id.toString(),
        userId,
        userCourseRole
      );
    }
  }

  // TAs: see all comments for supervising teams, only own comments for reviewing teams
  if (userCourseRole === COURSE_ROLE.TA) {
    const isSupervisingTA = reviewee.TA?.toString() === userId;
    const submission = await findSubmissionForUserOnAssignment(
      userId,
      userCourseRole,
      assignment.peerReviewId.toString(),
      assignmentId,
      peerReview.reviewerType,
      peerReview.teamSetId.toString()
    );

    if (submission) {
      return findCommentsForSubmissionVisible(
        submission._id.toString(),
        userId,
        userCourseRole
      );
    }

    if (isSupervisingTA)
      return findCommentsVisible(assignmentId, userId, userCourseRole, true);
  }
  throw new MissingAuthorizationError(UNAUTHORIZED_TO_VIEW_COMMENTS);
};

export const getPeerReviewCommentsBySubmissionId = async (
  userId: string,
  userCourseRole: string,
  assessmentId: string,
  peerReviewSubmissionId: string
) => {
  const pr = await PeerReviewModel.findOne({
    internalAssessmentId: assessmentId,
  })
    .select('_id')
    .lean();
  if (!pr) throw new NotFoundError('Peer review not found for assessment');

  const submission = await PeerReviewSubmissionModel.findById(
    peerReviewSubmissionId
  )
    .select('_id peerReviewId peerReviewAssignmentId')
    .lean();
  if (!submission) throw new NotFoundError('Peer review submission not found');

  if (String(submission.peerReviewId) !== String(pr._id)) {
    throw new BadRequestError(
      'Submission does not belong to this peer review assessment'
    );
  }

  if (userCourseRole === COURSE_ROLE.TA) {
    const hasTask = await PeerReviewGradingTaskModel.exists({
      peerReviewId: pr._id,
      peerReviewSubmissionId: submission._id,
      grader: oid(userId),
    });
    if (!hasTask) {
      throw new MissingAuthorizationError(
        'Not assigned to grade this submission'
      );
    }
  }

  // Return comments for THIS submission only
  const comments = await PeerReviewCommentModel.find({
    peerReviewSubmissionId: submission._id,
  })
    .populate('author', '_id name')
    .lean();

  // TA/Faculty graders can moderate all comments in the submission they're grading
  const canModerateAll = userCourseRole !== COURSE_ROLE.Student;
  return decorateCommentsForViewer(
    comments,
    userId,
    userCourseRole,
    canModerateAll
  );
};

export const addPeerReviewCommentByAssignmentId = async (
  userId: string,
  userCourseRole: string,
  assignmentId: string,
  submissionId: string,
  commentData: {
    filePath: string;
    startLine: number;
    endLine: number;
    comment: string;
  }
) => {
  const assignment = await fetchAssignment(assignmentId);
  const peerReview = await getPeerReviewById(
    assignment.peerReviewId.toString()
  );
  assertPeerReviewNotClosed(peerReview);
  const reviewee = await fetchReviewee(assignment.reviewee.toString());

  // Parse data
  const { filePath, startLine, endLine, comment } = commentData;

  // Validate comment data
  if (!comment || comment.trim().length === 0) {
    throw new BadRequestError('Comment text cannot be empty');
  } else if (startLine < 1 || endLine < 1) {
    throw new BadRequestError('Line numbers must be >= 1');
  } else if (commentData.startLine > commentData.endLine) {
    throw new BadRequestError('Start line cannot be greater than end line');
  }

  if (userCourseRole !== COURSE_ROLE.Faculty) {
    const isSupervisingTA =
      userCourseRole === COURSE_ROLE.TA && reviewee.TA?.toString() === userId;
    const taReviewerSubmission =
      userCourseRole === COURSE_ROLE.TA
        ? await findSubmissionForUserOnAssignment(
            userId,
            userCourseRole,
            assignment.peerReviewId.toString(),
            assignmentId,
            peerReview.reviewerType,
            peerReview.teamSetId.toString()
          )
        : null;

    if (isSupervisingTA && !taReviewerSubmission) {
      // TA supervisors can comment without a submission
    } else {
      if (!submissionId) {
        throw new BadRequestError('Submission ID is required to add comment');
      }
      const submission = await fetchSubmissionForAssignment(
        submissionId,
        assignmentId
      );
      await assertSubmissionWritableByCaller(
        userId,
        userCourseRole,
        submission
      );
    }
  }

  const newComment = new PeerReviewCommentModel({
    peerReviewId: assignment.peerReviewId,
    peerReviewAssignmentId: assignmentId,
    ...(submissionId && { peerReviewSubmissionId: submissionId }),
    createdAt: Date.now(),
    filePath,
    startLine,
    endLine,
    comment,
    author: userId,
    authorCourseRole: userCourseRole,
  });

  await newComment.save();
  return newComment;
};

export const updatePeerReviewCommentById = async (
  userId: string,
  userCourseRole: string,
  assignmentId: string,
  commentId: string,
  updatedComment: string,
  submissionId: string
) => {
  const comment = await PeerReviewCommentModel.findById(commentId);
  if (!comment) throw new NotFoundError(COMMENT_NOT_FOUND);

  // Faculty can update any comment
  if (userCourseRole === COURSE_ROLE.Faculty) {
    if (updatedComment.trim().length === 0)
      throw new BadRequestError('Comment text cannot be empty');
    comment.comment = updatedComment;
    comment.updatedAt = new Date();
    await comment.save();
    return;
  }

  // TAs can update any comment for teams they supervise
  if (userCourseRole === COURSE_ROLE.TA) {
    const assignment = await fetchAssignment(assignmentId);
    const peerReview = await getPeerReviewById(
      assignment.peerReviewId.toString()
    );
    const reviewee = await fetchReviewee(assignment.reviewee.toString());
    const isSupervisingTA = reviewee.TA?.toString() === userId;
    const taReviewerSubmission = await findSubmissionForUserOnAssignment(
      userId,
      userCourseRole,
      assignment.peerReviewId.toString(),
      assignmentId,
      peerReview.reviewerType,
      peerReview.teamSetId.toString()
    );

    if (isSupervisingTA && !taReviewerSubmission) {
      if (updatedComment.trim().length === 0)
        throw new BadRequestError('Comment text cannot be empty');
      comment.comment = updatedComment;
      comment.updatedAt = new Date();
      await comment.save();
      return;
    }
  }

  // Non-supervisors must provide submissionId
  if (!submissionId)
    throw new BadRequestError('Submission ID is required to update comment');
  const submission = await fetchSubmissionForAssignment(
    submissionId,
    assignmentId
  );
  if (submission.status === 'Submitted')
    throw new BadRequestError('Cannot update comments on submitted reviews');
  await assertSubmissionWritableByCaller(userId, userCourseRole, submission);

  if (comment.peerReviewSubmissionId?.toString() !== submissionId)
    throw new BadRequestError(
      'Comment does not belong to the provided submission'
    );

  const peerReview = await getPeerReviewById(comment.peerReviewId.toString());
  assertPeerReviewNotClosed(peerReview);

  // Team reviewer mode: any member of the reviewer team can update team comments
  if (
    userCourseRole === COURSE_ROLE.Student &&
    submission.reviewerKind === 'Team'
  ) {
    if (!submission.reviewerTeamId)
      throw new MissingAuthorizationError(UNAUTHORIZED_TO_UPDATE_COMMENTS);
  } else {
    // Non-team mode: only author can update
    if (userId !== comment.author.toString())
      throw new MissingAuthorizationError(UNAUTHORIZED_TO_UPDATE_COMMENTS);
  }

  if (updatedComment.trim().length === 0)
    throw new BadRequestError('Comment text cannot be empty');

  comment.comment = updatedComment;
  comment.updatedAt = new Date();
  await comment.save();
  return;
};

export const deletePeerReviewCommentById = async (
  userId: string,
  userCourseRole: string,
  assignmentId: string,
  commentId: string,
  submissionId: string
) => {
  const comment = await PeerReviewCommentModel.findById(commentId);
  if (!comment) throw new NotFoundError(COMMENT_NOT_FOUND);

  // For moderation: course coordinators can delete any comment
  if (userCourseRole === COURSE_ROLE.Faculty) {
    return await PeerReviewCommentModel.deleteOne({ _id: commentId });
  }

  // For moderation: TAs can delete any comment for teams they supervise
  if (userCourseRole === COURSE_ROLE.TA) {
    const assignment = await fetchAssignment(
      comment.peerReviewAssignmentId.toString()
    );
    const peerReview = await getPeerReviewById(
      assignment.peerReviewId.toString()
    );
    const reviewee = await fetchReviewee(assignment.reviewee.toString());
    const isSupervisingTA = reviewee.TA?.toString() === userId;
    const taReviewerSubmission = await findSubmissionForUserOnAssignment(
      userId,
      userCourseRole,
      assignment.peerReviewId.toString(),
      assignment._id.toString(),
      peerReview.reviewerType,
      peerReview.teamSetId.toString()
    );

    if (isSupervisingTA && !taReviewerSubmission)
      return await PeerReviewCommentModel.deleteOne({ _id: commentId });
  }

  const peerReview = await getPeerReviewById(comment.peerReviewId.toString());
  assertPeerReviewNotClosed(peerReview);

  if (!submissionId)
    throw new BadRequestError('Submission ID is required to delete comment');
  const submission = await fetchSubmissionForAssignment(
    submissionId,
    assignmentId
  );
  if (submission.status === 'Submitted')
    throw new BadRequestError('Cannot delete comments on submitted reviews');
  if (comment.peerReviewSubmissionId.toString() !== submissionId)
    throw new BadRequestError(
      'Comment does not belong to the provided submission'
    );
  await assertSubmissionWritableByCaller(userId, userCourseRole, submission);

  // Team reviewer mode: any member of the reviewer team can delete team comments
  if (
    userCourseRole === COURSE_ROLE.Student &&
    submission.reviewerKind === 'Team'
  ) {
    if (!submission.reviewerTeamId)
      throw new MissingAuthorizationError(UNAUTHORIZED_TO_DELETE_COMMENTS);
    return await PeerReviewCommentModel.deleteOne({ _id: commentId });
  }

  // Individual student/TA reviewers can only delete own comments
  if (userId === comment.author.toString())
    return await PeerReviewCommentModel.deleteOne({ _id: commentId });

  throw new MissingAuthorizationError(UNAUTHORIZED_TO_DELETE_COMMENTS);
};

// For moderation only, students cannot flag comments
export const flagPeerReviewCommentById = async (
  userId: string,
  userCourseRole: string,
  commentId: string,
  flagStatus: boolean,
  flagReason?: string
) => {
  if (
    userCourseRole !== COURSE_ROLE.TA &&
    userCourseRole !== COURSE_ROLE.Faculty
  ) {
    throw new MissingAuthorizationError(UNAUTHORIZED_TO_FLAG_COMMENTS);
  }

  const comment = await PeerReviewCommentModel.findById(commentId);
  if (!comment) throw new NotFoundError(COMMENT_NOT_FOUND);

  // TA/Faculty moderation is allowed at any point (draft/submitted, grading in-progress/completed).
  if (flagStatus) {
    // Flagging: record flag details and clear any prior unflag state
    comment.isFlagged = true;
    comment.flagReason = flagReason ?? '';
    comment.flaggedAt = new Date();
    comment.flaggedBy = oid(userId);
    comment.unflagReason = '';
    (comment as any).unflaggedAt = null;
    (comment as any).unflaggedBy = null;
  } else {
    // Unflagging: clear flag state and record unflag details
    comment.isFlagged = false;
    comment.unflagReason = flagReason ?? '';
    comment.unflaggedAt = new Date();
    comment.unflaggedBy = oid(userId);
  }
  await comment.save();
  return;
};

// Helpers
const fetchAssignment = async (assignmentId: string) => {
  const assignment = await PeerReviewAssignmentModel.findById(assignmentId);
  if (!assignment) throw new NotFoundError(ASSIGNMENT_NOT_FOUND);
  return assignment;
};

const fetchReviewee = async (teamId: string) => {
  const team = await TeamModel.findById(teamId);
  if (!team)
    throw new NotFoundError('Reviewee team not found for this assignment');
  return team;
};

const findCommentsAnonymous = async (assignmentId: string) => {
  return PeerReviewCommentModel.find({
    peerReviewAssignmentId: assignmentId,
    isFlagged: { $ne: true },
  })
    .select('-author -flaggedBy') // hide identity
    .lean();
};

const findCommentsVisible = async (
  assignmentId: string,
  userId: string,
  userCourseRole: string,
  canModerateAll: boolean
) => {
  const comments = await PeerReviewCommentModel.find({
    peerReviewAssignmentId: assignmentId,
  })
    .populate('author', '_id name')
    .lean();

  return decorateCommentsForViewer(
    comments,
    userId,
    userCourseRole,
    canModerateAll
  );
};

const findCommentsForSubmissionVisible = async (
  submissionId: string,
  userId: string,
  userCourseRole: string
) => {
  const comments = await PeerReviewCommentModel.find({
    peerReviewSubmissionId: submissionId,
  })
    .populate('author', '_id name')
    .lean();

  return decorateCommentsForViewer(comments, userId, userCourseRole, false);
};

const decorateCommentsForViewer = async (
  comments: any[],
  userId: string,
  userCourseRole: string,
  canModerateAll: boolean
) => {
  const visibleComments =
    userCourseRole === COURSE_ROLE.Student
      ? comments.filter(comment => !comment.isFlagged)
      : comments;

  if (!visibleComments?.length) return visibleComments;

  const submissionIds = Array.from(
    new Set(
      visibleComments
        .map(c => c.peerReviewSubmissionId)
        .filter(Boolean)
        .map((id: any) => String(id))
    )
  ).map(oid);

  const submissions = submissionIds.length
    ? await PeerReviewSubmissionModel.find({ _id: { $in: submissionIds } })
        .select('_id reviewerKind reviewerTeamId')
        .lean()
    : [];

  const submissionById = new Map(submissions.map(s => [String(s._id), s]));

  const reviewerTeamIds = Array.from(
    new Set(
      submissions
        .filter(s => s.reviewerKind === 'Team' && s.reviewerTeamId)
        .map(s => String(s.reviewerTeamId))
    )
  ).map(oid);

  const reviewerTeams = reviewerTeamIds.length
    ? await TeamModel.find({ _id: { $in: reviewerTeamIds } })
        .select('_id number members')
        .lean()
    : [];

  const reviewerTeamById = new Map(reviewerTeams.map(t => [String(t._id), t]));

  return visibleComments.map(c => {
    const submission = c.peerReviewSubmissionId
      ? submissionById.get(String(c.peerReviewSubmissionId))
      : null;

    let displayAuthorName = c.author?.name;
    let canManage =
      canModerateAll ||
      userCourseRole === COURSE_ROLE.TA ||
      userCourseRole === COURSE_ROLE.Faculty;

    // Only show team name if there's no individual author (system-generated comments)
    if (
      !c.author?.name &&
      submission?.reviewerKind === 'Team' &&
      submission.reviewerTeamId
    ) {
      const team = reviewerTeamById.get(String(submission.reviewerTeamId));
      if (team) {
        displayAuthorName = `Team ${team.number}`;
      }
    }

    // Determine if current user can manage this comment
    if (!canManage) {
      // User can manage if they're the author
      canManage = String(c.author?._id) === userId;

      // Student team members can manage team reviewer comments
      if (
        !canManage &&
        userCourseRole === COURSE_ROLE.Student &&
        submission?.reviewerKind === 'Team' &&
        submission.reviewerTeamId
      ) {
        const team = reviewerTeamById.get(String(submission.reviewerTeamId));
        if (team && team.members?.map(String).includes(userId)) {
          canManage = true;
        }
      }
    }

    return {
      ...c,
      displayAuthorName,
      canManage,
    };
  });
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
  teamSetId: string
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
};
