import { Request, Response } from 'express';
import { getAccountId } from '../utils/auth';
import AccountModel from '@models/Account';
import { getUserIdByAccountId } from 'services/accountService';
import { NotFoundError, MissingAuthorizationError } from '../services/errors';
import {
  getPeerReviewAssignmentsByPeerReviewId,
  getPeerReviewAssignmentsByTeamId,
  getPeerReviewAssignmentById,
  assignPeerReviewById,
  randomAssignPeerReviewsById,
} from '../services/peerReviewAssignmentService';

export const getPeerReviewAssignmentsByPeerReview = async (
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
  const peerReviewId = req.params.peerReviewId;

  try {
    const peerReviewAssignments = await getPeerReviewAssignmentsByPeerReviewId(
      userId,
      userCourseRole,
      peerReviewId
    );
    res.status(200).json(peerReviewAssignments);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ message: error.message });
    } else {
      console.error('Error fetching peer review assignments:', error);
      res
        .status(500)
        .json({ message: 'Failed to get peer review assignments' });
    }
  }
};

export const getPeerReviewAssignmentsByTeam = async (
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
  const teamId = req.params.teamId;

  try {
    const peerReviewAssignments = await getPeerReviewAssignmentsByTeamId(
      userCourseRole,
      teamId
    );
    res.status(200).json(peerReviewAssignments);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ message: error.message });
    } else {
      console.error('Error fetching peer review assignments for team:', error);
      res
        .status(500)
        .json({ message: 'Failed to get peer review assignments for team' });
    }
  }
};

export const getPeerReviewAssignment = async (req: Request, res: Response) => {
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

  try {
    const assignment = await getPeerReviewAssignmentById(
      userCourseRole,
      userId,
      req.params.peerReviewAssignmentId
    );
    res.status(200).json(assignment);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ message: error.message });
    } else {
      console.error('Error fetching peer review assignment:', error);
      res.status(500).json({ message: 'Failed to get peer review assignment' });
    }
  }
};

export const assignPeerReview = async (req: Request, res: Response) => {
  const peerReviewId = req.params.peerReviewId;
  const assignmentData = req.body;

  try {
    await assignPeerReviewById(peerReviewId, assignmentData);
    res.status(200).json({ message: 'Peer reviews assigned successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ message: error.message });
    } else {
      console.error('Error assigning peer reviews:', error);
      res.status(500).json({ message: 'Failed to assign peer reviews' });
    }
  }
};

export const randomAssignPeerReviews = async (req: Request, res: Response) => {
  const peerReviewId = req.params.peerReviewId;

  try {
    await randomAssignPeerReviewsById(peerReviewId);
    res
      .status(200)
      .json({ message: 'Peer reviews randomly assigned successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ message: error.message });
    } else {
      console.error('Error randomly assigning peer reviews:', error);
      res
        .status(500)
        .json({ message: 'Failed to randomly assign peer reviews' });
    }
  }
};
