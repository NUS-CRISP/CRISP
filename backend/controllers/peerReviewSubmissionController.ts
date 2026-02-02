import { Request, Response } from 'express';
import { verifyRequestUser, verifyRequestPermission } from '../utils/auth';
import { handleError } from '../utils/error';
import {
  getSubmissionsByAssignmentId,
  updateMySubmissionDraft,
  submitMySubmission,
} from '../services/peerReviewSubmissionService';

export const getSubmissionsForAssignment = async (req: Request, res: Response) => {
  try {
    const { account, userCourseRole } = await verifyRequestUser(req);
    const userId = await verifyRequestPermission(account._id, userCourseRole, []);

    const { courseId, peerReviewId, peerReviewAssignmentId } = req.params;

    const submissions = await getSubmissionsByAssignmentId(
      userId,
      userCourseRole,
      peerReviewId,
      peerReviewAssignmentId
    );

    res.status(200).json(submissions);
  } catch (error) {
    return handleError(res, error, 'Failed to get submissions for assignment');
  }
};

export const putMySubmissionDraft = async (req: Request, res: Response) => {
  try {
    const { account, userCourseRole } = await verifyRequestUser(req);
    const userId = await verifyRequestPermission(account._id, userCourseRole, []);
    const { courseId, peerReviewId, assignmentId } = req.params;

    const updated = await updateMySubmissionDraft(
      userId,
      userCourseRole,
      peerReviewId,
      assignmentId,
    );

    res.status(200).json(updated);
  } catch (err) {
    handleError(res, err, 'Failed to save submission draft');
  }
};

export const postSubmitMySubmission = async (req: Request, res: Response) => {
  try {
    const { account, userCourseRole } = await verifyRequestUser(req);
    const userId = await verifyRequestPermission(account._id, userCourseRole, []);
    const { courseId, peerReviewId, assignmentId } = req.params;

    const submitted = await submitMySubmission(
      userId,
      userCourseRole,
      peerReviewId,
      assignmentId
    );

    res.status(200).json(submitted);
  } catch (err) {
    handleError(res, err, 'Failed to submit submission');
  }
};
