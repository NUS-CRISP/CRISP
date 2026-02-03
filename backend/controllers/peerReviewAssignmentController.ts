import { Request, Response } from 'express';
import { NotFoundError, BadRequestError } from '../services/errors';
import {
  getPeerReviewAssignmentById,
  assignPeerReviews,
  addManualAssignment,
  removeManualAssignment,
} from '../services/peerReviewAssignmentService';
import { COURSE_ROLE } from '@shared/types/auth/CourseRole';
import { verifyRequestUser, verifyRequestPermission } from '../utils/auth';

export const getPeerReviewAssignment = async (req: Request, res: Response) => {
  const { account, userCourseRole } = await verifyRequestUser(req);
  const userId = await verifyRequestPermission(account._id, userCourseRole, []);
  const { courseId, peerReviewAssignmentId } = req.params;

  try {
    const assignment = await getPeerReviewAssignmentById(
      userCourseRole,
      userId,
      peerReviewAssignmentId
    );
    console.log('Fetched peer review assignment:', assignment);
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

export const postAssignPeerReviews = async (req: Request, res: Response) => {
  const { account, userCourseRole } = await verifyRequestUser(req);
  const userId = await verifyRequestPermission(account._id, userCourseRole, [
    COURSE_ROLE.Faculty,
  ]);
  const { courseId, peerReviewId } = req.params;
  const { reviewsPerReviewer, allowSameTA, groupsToAssign } = req.body;

  try {
    await assignPeerReviews(
      courseId,
      peerReviewId,
      userId,
      reviewsPerReviewer,
      allowSameTA,
      groupsToAssign
    );
    res.status(200).json({ message: 'Peer reviews assigned successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ message: error.message });
    } else if (error instanceof BadRequestError) {
      console.error('Error assigning peer reviews:', error.message);
      res.status(400).json({ message: error.message });
    } else {
      console.error('Error assigning peer reviews:', error);
      res.status(500).json({
        message: (error as Error).message || 'Failed to assign peer reviews',
      });
    }
  }
};

export const postAddManualAssignment = async (req: Request, res: Response) => {
  const { account, userCourseRole } = await verifyRequestUser(req);
  const userId = await verifyRequestPermission(account._id, userCourseRole, [
    COURSE_ROLE.Faculty,
  ]);
  const { courseId, peerReviewId } = req.params;
  const { revieweeId, reviewerId, isTA } = req.body;

  try {
    await addManualAssignment(
      courseId,
      peerReviewId,
      revieweeId,
      reviewerId,
      userId,
      isTA
    );
    res
      .status(200)
      .json({ message: 'Reviewer assigned to reviewee successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ message: error.message });
    } else {
      console.error('Error assigning reviewer to reviewee:', error);
      res.status(500).json({
        message:
          (error as Error).message || 'Failed to assign reviewer to reviewee',
      });
    }
  }
};

export const deleteManualAssignment = async (req: Request, res: Response) => {
  const { account, userCourseRole } = await verifyRequestUser(req);
  await verifyRequestPermission(account._id, userCourseRole, [
    COURSE_ROLE.Faculty,
  ]);
  const { courseId, peerReviewId, revieweeId, reviewerId } = req.params;
  const isTA = req.query.isTA === 'true';

  try {
    await removeManualAssignment(peerReviewId, revieweeId, reviewerId, isTA);
    res
      .status(200)
      .json({ message: 'Reviewer removed from reviewee successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ message: error.message });
    } else {
      console.error('Error deleting reviewer from reviewee:', error);
      res.status(500).json({
        message:
          (error as Error).message || 'Failed to delete reviewer from reviewee',
      });
    }
  }
};
