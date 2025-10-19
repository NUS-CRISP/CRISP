import { Request, Response } from 'express';
import { NotFoundError, BadRequestError } from '../services/errors';
import {
  getPeerReviewInfoById,
  assignPeerReviews,
  addManualAssignment,
  removeManualAssignment,
} from '../services/peerReviewAssignmentService';
import CourseRole from '@shared/types/auth/CourseRole';
import { verifyRequestUser, verifyRequestPermission } from '../utils/auth';

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

export const postAssignPeerReviews = async (req: Request, res: Response) => {
  const { account, userCourseRole } = await verifyRequestUser(req);
  const userId = await verifyRequestPermission(account._id, userCourseRole, [
    CourseRole.Faculty,
  ]);
  const { courseId, peerReviewId } = req.params;
  const { reviewsPerReviewer, allowSameTA } = req.body;

  try {
    await assignPeerReviews(
      courseId,
      peerReviewId,
      userId,
      reviewsPerReviewer,
      allowSameTA
    );
    res.status(204).json('Successfully assigned peer reviews');
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ message: error.message });
    } else if (error instanceof BadRequestError) {
      console.error('Error assigning peer reviews:', error.message);
      res.status(400).json({ message: error.message });
    } else {
      console.error('Error assigning peer reviews:', error);
      res
        .status(500)
        .json((error as Error).message || 'Failed to assign peer reviews');
    }
  }
};

export const postAddManualAssignment = async (req: Request, res: Response) => {
  const { account, userCourseRole } = await verifyRequestUser(req);
  const userId = await verifyRequestPermission(account._id, userCourseRole, [
    CourseRole.Faculty,
  ]);
  const { courseId, peerReviewId } = req.params;
  const { revieweeId, reviewerId } = req.body;

  try {
    await addManualAssignment(
      courseId,
      peerReviewId,
      revieweeId,
      reviewerId,
      userId
    );
    res.status(204).end();
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ message: error.message });
    } else {
      console.error('Error assigning reviewer to reviewee:', error);
      res
        .status(500)
        .json(
          (error as Error).message || 'Failed to assign reviewer to reviewee'
        );
    }
  }
};

export const deleteManualAssignment = async (req: Request, res: Response) => {
  const { account, userCourseRole } = await verifyRequestUser(req);
  await verifyRequestPermission(account._id, userCourseRole, [
    CourseRole.Faculty,
  ]);
  const { courseId, peerReviewId, revieweeId, reviewerId } = req.params;

  try {
    await removeManualAssignment(peerReviewId, revieweeId, reviewerId);
    res.status(204).end();
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ message: error.message });
    } else {
      console.error('Error deleting reviewer from reviewee:', error);
      res
        .status(500)
        .json(
          (error as Error).message || 'Failed to delete reviewer from reviewee'
        );
    }
  }
};
