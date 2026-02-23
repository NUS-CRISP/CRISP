import { Request, Response } from 'express';
import {
  getAllPeerReviewsyId,
  getPeerReviewByAssessmentId,
  getPeerReviewInfoById,
  deletePeerReviewById,
  updatePeerReviewById,
} from '../services/peerReviewService';
import { COURSE_ROLE } from '@shared/types/auth/CourseRole';
import { verifyRequestUser, verifyRequestPermission } from '../utils/auth';
import { handleError } from '../utils/error';

export const getAllPeerReviews = async (req: Request, res: Response) => {
  try {
    await verifyRequestUser(req);
    const peerReviews = await getAllPeerReviewsyId(req.params.courseId);
    res.status(200).json(peerReviews);
  } catch (error) {
    return handleError(res, error, 'Failed to get peer reviews');
  }
};

export const getPeerReviewByAssessment = async (req: Request, res: Response) => {
  try {
    const { account, userCourseRole } = await verifyRequestUser(req);
    const userId = await verifyRequestPermission(account._id, userCourseRole, []);
    const peerReviewAssignment = await getPeerReviewByAssessmentId(
      req.params.assessmentId
    );
    res.status(200).json(peerReviewAssignment);
  } catch (error) {
    return handleError(res, error, 'Failed to get peer review assignment');
  }
};

export const getPeerReviewInfo = async (req: Request, res: Response) => {
  try {
    const { account, userCourseRole } = await verifyRequestUser(req);
    const userId = await verifyRequestPermission(
      account._id,
      userCourseRole,
      []
    );
    const { courseId, peerReviewId } = req.params;

    const peerReviewInfo = await getPeerReviewInfoById(
      userId,
      userCourseRole,
      courseId,
      peerReviewId
    );
    res.status(200).json(peerReviewInfo);
  } catch (error) {
    return handleError(res, error, 'Failed to get peer review info');
  }
};

export const deletePeerReview = async (req: Request, res: Response) => {
  try {
    const { account, userCourseRole } = await verifyRequestUser(req);
    await verifyRequestPermission(account._id, userCourseRole, [
      COURSE_ROLE.Faculty,
    ]);

    const deletedRes = await deletePeerReviewById(req.params.peerReviewId);
    res.status(200).json({
      message: `${deletedRes.deletedPeerReviewTitle} deleted successfully`,
    });
  } catch (error) {
    return handleError(res, error, 'Failed to delete peer review');
  }
};

export const updatePeerReview = async (req: Request, res: Response) => {
  try {
    const { account, userCourseRole } = await verifyRequestUser(req);
    const userId = await verifyRequestPermission(account._id, userCourseRole, [
      COURSE_ROLE.Faculty,
    ]);

    await updatePeerReviewById(req.params.peerReviewId, req.body);
    res
      .status(200)
      .json({ message: 'Peer review settings updated successfully' });
  } catch (error) {
    return handleError(res, error, 'Failed to update peer review');
  }
};
