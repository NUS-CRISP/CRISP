import { Request, Response } from 'express';
import { verifyRequestPermission, verifyRequestUser } from '../utils/auth';
import {
  getPeerReviewCommentsByAssignmentId,
  addPeerReviewCommentByAssignmentId,
  updatePeerReviewCommentById,
  deletePeerReviewCommentById,
  flagPeerReviewCommentById,
} from '../services/peerReviewCommentsService';
import { handleError } from '../utils/error';
import { COURSE_ROLE } from '@shared/types/auth/CourseRole';

export const getPeerReviewCommentsById = async (
  req: Request,
  res: Response
) => {
  try {
    const { account, userCourseRole } = await verifyRequestUser(req);
    const userId = await verifyRequestPermission(
      account._id,
      userCourseRole,
      []
    );
    const peerReviewAssignmentId = req.params.peerReviewAssignmentId;

    const comments = await getPeerReviewCommentsByAssignmentId(
      userId,
      userCourseRole,
      peerReviewAssignmentId
    );

    res.status(200).json(comments);
  } catch (error) {
    return handleError(res, error, 'Failed to get peer review comments');
  }
};

export const addPeerReviewComment = async (req: Request, res: Response) => {
  try {
    const { account, userCourseRole } = await verifyRequestUser(req);
    const userId = await verifyRequestPermission(
      account._id,
      userCourseRole,
      []
    );
    const { comment: commentData, submissionId } = req.body;

    const newComment = await addPeerReviewCommentByAssignmentId(
      userId,
      userCourseRole,
      req.params.peerReviewAssignmentId,
      submissionId,
      commentData
    );
    res.status(201).json(newComment);
  } catch (error) {
    return handleError(res, error, 'Failed to add peer review comment');
  }
};

export const updatePeerReviewComment = async (req: Request, res: Response) => {
  try {
    const { account, userCourseRole } = await verifyRequestUser(req);
    const userId = await verifyRequestPermission(
      account._id,
      userCourseRole,
      []
    );

    const { peerReviewAssignmentId, commentId } = req.params;
    const { comment: updatedComment, submissionId } = req.body;
    if (!updatedComment || typeof updatedComment !== 'string') {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    await updatePeerReviewCommentById(
      userId,
      userCourseRole,
      peerReviewAssignmentId,
      commentId,
      updatedComment,
      submissionId
    );
    res
      .status(200)
      .json({ message: 'Peer review comment updated successfully' });
  } catch (error) {
    return handleError(res, error, 'Failed to update peer review comment');
  }
};

export const deletePeerReviewComment = async (req: Request, res: Response) => {
  try {
    const { account, userCourseRole } = await verifyRequestUser(req);
    const userId = await verifyRequestPermission(
      account._id,
      userCourseRole,
      []
    );
    const { peerReviewAssignmentId, commentId } = req.params;
    const submissionId = req.body.submissionId;

    await deletePeerReviewCommentById(
      userId,
      userCourseRole,
      peerReviewAssignmentId,
      commentId,
      submissionId
    );
    res
      .status(200)
      .json({ message: 'Peer review comment deleted successfully' });
  } catch (error) {
    return handleError(res, error, 'Failed to delete peer review comment');
  }
};

export const flagPeerReviewComment = async (req: Request, res: Response) => {
  try {
    const { account, userCourseRole } = await verifyRequestUser(req);
    const userId = await verifyRequestPermission(account._id, userCourseRole, [
      COURSE_ROLE.Faculty,
      COURSE_ROLE.TA,
    ]);
    const { flagStatus, flagReason } = req.body;

    await flagPeerReviewCommentById(
      userId,
      userCourseRole,
      req.params.commentId,
      flagStatus,
      flagReason
    );
    res
      .status(200)
      .json({ message: 'Peer review comment flagged successfully' });
  } catch (error) {
    return handleError(res, error, 'Failed to flag peer review comment');
  }
};
