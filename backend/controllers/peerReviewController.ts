import { Request, Response } from 'express';
import {
  NotFoundError,
  BadRequestError,
  MissingAuthorizationError,
} from '../services/errors';
import {
  getAllPeerReviewsyId,
  createPeerReviewById,
  deletePeerReviewById,
  getPeerReviewSettingsById,
  updatePeerReviewSettingsById,
} from '../services/peerReviewService';
import { getAccountId } from '../utils/auth';
import AccountModel from '@models/Account';
import CrispRole from '@shared/types/auth/CrispRole';
import CourseRole from '@shared/types/auth/CourseRole';

export const getAllPeerReviews = async (req: Request, res: Response) => {
  try {
    const peerReviews = await getAllPeerReviewsyId(req.params.courseId);
    res.status(200).json(peerReviews);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ message: error.message });
    } else {
      console.error('Error fetching peer reviews:', error);
      res.status(500).json({ message: 'Failed to get peer reviews' });
    }
  }
};

export const createPeerReview = async (req: Request, res: Response) => {
  const accountId = await getAccountId(req);
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new MissingAuthorizationError('Access denied, invalid account');
  }
  const userCourseRole = account.courseRoles.find(
    cr => cr.course.toString() === req.params.courseId
  )?.courseRole;
  if (!userCourseRole || userCourseRole !== CourseRole.Faculty) {
    // Only course coordinators can create peer reviews
    throw new MissingAuthorizationError(
      'Access denied for user role: ' +
        [account.courseRoles, account.email, account.crispRole]
    );
  }

  try {
    const newPeerReview = await createPeerReviewById(
      req.params.courseId,
      req.body
    );
    res.status(201).json(newPeerReview);
  } catch (error) {
    if (error instanceof BadRequestError) {
      res.status(400).json({ message: error.message });
    } else if (error instanceof MissingAuthorizationError) {
      res.status(403).json({ message: error.message });
    } else {
      console.error('Error creating peer review:', error);
      res.status(500).json({ message: 'Failed to create peer review' });
    }
  }
};

export const deletePeerReview = async (req: Request, res: Response) => {
  const accountId = await getAccountId(req);
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new MissingAuthorizationError('Access denied');
  }
  const userCourseRole = account.courseRoles.find(
    cr => cr.course.toString() === req.params.courseId
  )?.courseRole;
  if (!userCourseRole || userCourseRole !== CourseRole.Faculty) {
    throw new MissingAuthorizationError('Access denied');
  }

  try {
    const deletedPeerReview = await deletePeerReviewById(
      req.params.peerReviewId
    );
    res
      .status(200)
      .json({ message: `${deletedPeerReview.title} deleted successfully` });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ message: error.message });
    } else if (error instanceof MissingAuthorizationError) {
      res.status(403).json({ message: error.message });
    } else {
      console.error('Error deleting peer review:', error);
      res.status(500).json({ message: 'Failed to delete peer review' });
    }
  }
};

export const getPeerReviewSettings = async (req: Request, res: Response) => {
  const accountId = await getAccountId(req);
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new MissingAuthorizationError('Access denied');
  }
  const userCourseRole = account.courseRoles.find(
    cr => cr.course.toString() === req.params.courseId
  )?.courseRole;
  if (!userCourseRole || userCourseRole !== CourseRole.Faculty) {
    throw new MissingAuthorizationError('Access denied');
  }

  try {
    const settings = await getPeerReviewSettingsById(req.params.peerReviewId);
    res.status(200).json(settings);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ message: error.message });
    } else {
      console.error('Error fetching peer review settings:', error);
      res.status(500).json({ message: 'Failed to get peer review settings' });
    }
  }
};

export const updatePeerReviewSettings = async (req: Request, res: Response) => {
  const accountId = await getAccountId(req);
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new MissingAuthorizationError('Access denied');
  }
  const userCourseRole = account.courseRoles.find(
    cr => cr.course.toString() === req.params.courseId
  )?.courseRole;
  if (!userCourseRole || userCourseRole !== CourseRole.Faculty) {
    throw new MissingAuthorizationError('Access denied');
  }

  try {
    await updatePeerReviewSettingsById(req.params.peerReviewId, req.body);
    res
      .status(200)
      .json({ message: 'Peer review settings updated successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ message: error.message });
    } else if (error instanceof BadRequestError) {
      res.status(400).json({ message: error.message });
    } else if (error instanceof MissingAuthorizationError) {
      res.status(403).json({ message: error.message });
    } else {
      console.error('Error updating peer review settings:', error);
      res
        .status(500)
        .json({ message: 'Failed to update peer review settings' });
    }
  }
};
