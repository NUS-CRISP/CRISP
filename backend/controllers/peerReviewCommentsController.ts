import { Request, Response } from 'express';
import { getAccountId } from '../utils/auth';
import AccountModel from '@models/Account';
import { getUserIdByAccountId } from 'services/accountService';
import {
  NotFoundError,
  BadRequestError,
  MissingAuthorizationError,
} from '../services/errors';
import {
  getPeerReviewCommentsByAssignmentId,
  addPeerReviewCommentByAssignmentId,
  updatePeerReviewCommentById,
  deletePeerReviewCommentById,
} from '../services/peerReviewCommentsService';

export const getPeerReviewCommentsById = async (
  req: Request,
  res: Response
) => {
  const accountId = await getAccountId(req);
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new MissingAuthorizationError('Access denied');
  }
  const userCourseRole = account.courseRoles.find(
    cr => cr.course.toString() === req.params.courseId
  )?.courseRole;
  if (!userCourseRole) {
    throw new MissingAuthorizationError('Access denied');
  }
  const userId = await getUserIdByAccountId(accountId);
  const peerReviewAssignmentId = req.params.peerReviewAssignmentId;

  try {
    const comments = await getPeerReviewCommentsByAssignmentId(
      userId,
      userCourseRole,
      peerReviewAssignmentId
    );
    console.log('comments:', comments);
    res.status(200).json(comments);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ message: error.message });
    } else {
      console.error('Error fetching peer review comments:', error);
      res.status(500).json({ message: 'Failed to get peer review comments' });
    }
  }
};

export const addPeerReviewComment = async (req: Request, res: Response) => {
  const accountId = await getAccountId(req);
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new MissingAuthorizationError('Access denied');
  }
  const userCourseRole = account.courseRoles.find(
    cr => cr.course.toString() === req.params.courseId
  )?.courseRole;
  if (!userCourseRole) {
    throw new MissingAuthorizationError('Access denied');
  }
  const userId = await getUserIdByAccountId(accountId);
  console.log('userId:', userId);
  console.log('peerReviewAssignmentId:', req.params.peerReviewAssignmentId);
  console.log('commentData:', req.body);

  try {
    const newComment = await addPeerReviewCommentByAssignmentId(
      userId,
      userCourseRole,
      req.params.peerReviewAssignmentId,
      req.body
    );
    res.status(201).json(newComment);
  } catch (error) {
    if (error instanceof BadRequestError) {
      res.status(400).json({ message: error.message });
    } else {
      console.error('Error adding peer review comment:', error);
      res.status(500).json({ message: 'Failed to add peer review comment' });
    }
  }
};

export const updatePeerReviewComment = async (req: Request, res: Response) => {
  const commentId = req.params.commentId;
  const updatedComment = req.body.comment;
  if (!updatedComment || typeof updatedComment !== 'string') {
    return res.status(400).json({ message: 'Comment text is required' });
  }

  const accountId = await getAccountId(req);
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new MissingAuthorizationError('Access denied');
  }
  const userId = await getUserIdByAccountId(accountId);

  try {
    await updatePeerReviewCommentById(userId, commentId, updatedComment);
    res
      .status(200)
      .json({ message: 'Peer review comment updated successfully' });
  } catch (error) {
    if (error instanceof BadRequestError) {
      res.status(400).json({ message: error.message });
    } else {
      console.error('Error updating peer review comment:', error);
      res.status(500).json({ message: 'Failed to update peer review comment' });
    }
  }
};

export const deletePeerReviewComment = async (req: Request, res: Response) => {
  const accountId = await getAccountId(req);
  const account = await AccountModel.findById(accountId);
  if (!account) throw new MissingAuthorizationError('Access denied');

  const courseId = req.params.courseId;
  const userId = await getUserIdByAccountId(accountId);
  const userCourseRole = account.courseRoles.find(
    cr => cr.course.toString() === courseId
  )?.courseRole;
  if (!userCourseRole) throw new MissingAuthorizationError('Access denied');

  try {
    await deletePeerReviewCommentById(
      userId,
      userCourseRole,
      req.params.commentId
    );
    res
      .status(200)
      .json({ message: 'Peer review comment deleted successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ message: error.message });
    } else {
      console.error('Error deleting peer review comment:', error);
      res.status(500).json({ message: 'Failed to delete peer review comment' });
    }
  }
};
