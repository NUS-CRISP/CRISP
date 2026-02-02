import { Request, Response } from 'express';
import {
  getPeerReviewAssignmentById,
  assignPeerReviews,
  addManualAssignment,
  removeManualAssignment,
} from '../services/peerReviewAssignmentService';
import { COURSE_ROLE } from '@shared/types/auth/CourseRole';
import { verifyRequestUser, verifyRequestPermission } from '../utils/auth';
import { handleError } from '../utils/error';

export const getPeerReviewAssignment = async (req: Request, res: Response) => {

  try {
    const { account, userCourseRole } = await verifyRequestUser(req);
    const userId = await verifyRequestPermission(account._id, userCourseRole, []);
    const { courseId, peerReviewAssignmentId } = req.params;
    
    const assignment = await getPeerReviewAssignmentById(
      userCourseRole,
      userId,
      peerReviewAssignmentId
    );
    res.status(200).json(assignment);
  } catch (error) {
    return handleError(res, error, 'Failed to get peer review assignment');
  }
};

export const postAssignPeerReviews = async (req: Request, res: Response) => {

  try {
    const { account, userCourseRole } = await verifyRequestUser(req);
    const userId = await verifyRequestPermission(account._id, userCourseRole, [
      COURSE_ROLE.Faculty,
    ]);
    const { courseId, peerReviewId } = req.params;
    const { reviewsPerReviewer, allowSameTA, groupsToAssign } = req.body;
    
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
    return handleError(res, error, 'Failed to assign peer reviews');
  }
};

export const postAddManualAssignment = async (req: Request, res: Response) => {
  try {
    const { account, userCourseRole } = await verifyRequestUser(req);
    const userId = await verifyRequestPermission(account._id, userCourseRole, [
      COURSE_ROLE.Faculty,
    ]);
    const { courseId, peerReviewId } = req.params;
    const { revieweeId, reviewerId, isTA } = req.body;
    
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
    return handleError(res, error, 'Failed to add reviewer to reviewee');
  }
};

export const deleteManualAssignment = async (req: Request, res: Response) => {
  try {
    const { account, userCourseRole } = await verifyRequestUser(req);
    await verifyRequestPermission(account._id, userCourseRole, [
      COURSE_ROLE.Faculty,
    ]);
    const { courseId, peerReviewId, revieweeId, reviewerId } = req.params;
    const isTA = req.query.isTA === 'true';
    
    await removeManualAssignment(peerReviewId, revieweeId, reviewerId, isTA);
    res
      .status(200)
      .json({ message: 'Reviewer removed from reviewee successfully' });
  } catch (error) {
    return handleError(res, error, 'Failed to remove reviewer from reviewee');
  }
};
