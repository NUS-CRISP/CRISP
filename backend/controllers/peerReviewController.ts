import { Request, Response } from 'express';
import {
  NotFoundError,
  BadRequestError,
  MissingAuthorizationError,
} from '../services/errors';
import {
  getAllPeerReviewsyId,
  getPeerReviewInfoById,
  createPeerReviewById,
  deletePeerReviewById,
  updatePeerReviewById,
} from '../services/peerReviewService';
import { COURSE_ROLE } from '@shared/types/auth/CourseRole';
import { verifyRequestUser, verifyRequestPermission } from '../utils/auth';

export const getAllPeerReviews = async (req: Request, res: Response) => {
  await verifyRequestUser(req);
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

export const getPeerReviewInfo = async (req: Request, res: Response) => {
  const { account, userCourseRole } = await verifyRequestUser(req);
  const userId = await verifyRequestPermission(account._id, userCourseRole, []);
  const { courseId, peerReviewId } = req.params;

  try {
    const peerReviewInfo = await getPeerReviewInfoById(
      userId,
      userCourseRole,
      courseId,
      peerReviewId
    );
    res.status(200).json(peerReviewInfo);
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

export const createPeerReview = async (req: Request, res: Response) => {
  const { account, userCourseRole } = await verifyRequestUser(req);
  const userId = await verifyRequestPermission(account._id, userCourseRole, [
    COURSE_ROLE.Faculty,
  ]);

  try {
    const newPeerReview = await createPeerReviewById(
      req.params.courseId,
      userId,
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
  const { account, userCourseRole } = await verifyRequestUser(req);
  await verifyRequestPermission(account._id, userCourseRole, [
    COURSE_ROLE.Faculty,
  ]);

  try {
    const deletedRes = await deletePeerReviewById(req.params.peerReviewId);
    res.status(200).json({
      message: `${deletedRes.deletedPeerReviewTitle} deleted successfully`,
    });
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

export const updatePeerReview = async (req: Request, res: Response) => {
  const { account, userCourseRole } = await verifyRequestUser(req);
  const userId = await verifyRequestPermission(account._id, userCourseRole, [
    COURSE_ROLE.Faculty,
  ]);

  try {
    await updatePeerReviewById(req.params.peerReviewId, userId, req.body);
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
