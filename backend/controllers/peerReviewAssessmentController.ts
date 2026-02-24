import { Request, Response } from 'express';
import { verifyRequestPermission, verifyRequestUser } from '../utils/auth';
import {
  getPeerReviewByAssessmentId,
  updatePeerReviewAssessmentById,
  deletePeerReviewAssessmentById,
  createPeerReviewAssessmentForCourse,
  getPeerReviewSubmissionsForAssessmentById,
} from '../services/peerReviewAssessmentService';
import { handleError } from 'utils/error';
import { COURSE_ROLE } from '@shared/types/auth/CourseRole';

/* ------------------------------- Peer Review Assessment ------------------------------- */

export const getPeerReviewByAssessment = async (req: Request, res: Response) => {
  try {
    const { account, userCourseRole } = await verifyRequestUser(req);
    await verifyRequestPermission(account._id, userCourseRole, [COURSE_ROLE.Faculty, COURSE_ROLE.TA]);
    const peerReviewAssignment = await getPeerReviewByAssessmentId(
      req.params.assessmentId
    );
    res.status(200).json(peerReviewAssignment);
  } catch (error) {
    return handleError(res, error, 'Failed to get peer review assignment');
  }
};

export const createPeerReviewAssessment = async (req: Request, res: Response) => {
  try {
      const { account, userCourseRole } = await verifyRequestUser(req);
      await verifyRequestPermission(account._id, userCourseRole, [
        COURSE_ROLE.Faculty,
      ]);
  
      const newPeerReview = await createPeerReviewAssessmentForCourse(
        req.params.courseId,
        req.body
      );
      res.status(201).json(newPeerReview);
    } catch (error) {
      return handleError(res, error, 'Failed to create peer review');
    }  
};

export const updatePeerReviewAssessment = async (req: Request, res: Response) => {
  try {
    const { account, userCourseRole } = await verifyRequestUser(req);
    await verifyRequestPermission(account._id, userCourseRole, [
      COURSE_ROLE.Faculty,
    ]);
    const { assessmentId } = req.params;
    const updateData = req.body;
    await updatePeerReviewAssessmentById(assessmentId, updateData);
    res.status(200).json({ message: 'Peer review assessment updated successfully' });
  } catch (error) {
    return handleError(res, error, 'Failed to update peer review: ');
  }
};

export const deletePeerReviewAssessment = async (req: Request, res: Response) => {
  try {
    const { account, userCourseRole } = await verifyRequestUser(req);
    await verifyRequestPermission(account._id, userCourseRole, [
      COURSE_ROLE.Faculty,
    ]);
    const { assessmentId } = req.params;
    const deletedRes = await deletePeerReviewAssessmentById(assessmentId);
    res.status(200).json({
      message: `${deletedRes.deletedPeerReviewTitle} deleted successfully`,
    });
  } catch (error) {
    return handleError(res, error, 'Failed to delete peer review: ');
  }
};

/* ------------------------------- Peer Review Assessment Submissions ------------------------------- */

export const getPeerReviewSubmissionsForAssessment = async (req: Request, res: Response) => {
  try {
    const { account, userCourseRole } = await verifyRequestUser(req);
    await verifyRequestPermission(account._id, userCourseRole, [COURSE_ROLE.Faculty, COURSE_ROLE.TA]);
    const submissions = await getPeerReviewSubmissionsForAssessmentById(req.params.assessmentId);
    res.status(200).json(submissions);
  } catch (error) {
    return handleError(res, error, 'Failed to get peer review submissions for assessment');
  }
};

