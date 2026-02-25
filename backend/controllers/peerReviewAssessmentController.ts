import { Request, Response } from 'express';
import { verifyRequestPermission, verifyRequestUser } from '../utils/auth';
import {
  getPeerReviewByAssessmentId,
  getPeerReviewSubmissionsForAssessmentById,
  getPeerReviewResultsForAssessmentById,
  updatePeerReviewAssessmentById,
  deletePeerReviewAssessmentById,
  createPeerReviewAssessmentForCourse,
  getPeerReviewGradingDTO,
} from '../services/peerReviewAssessmentService';
import { handleError } from 'utils/error';
import { COURSE_ROLE } from '@shared/types/auth/CourseRole';
import { getGradingTaskForSubmissionById, startGradingTaskForFacultyById, submitGradingTaskById, updateGradingTaskById } from 'services/peerReviewGradingTaskService';

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
    const userId = await verifyRequestPermission(account._id, userCourseRole, [COURSE_ROLE.Faculty, COURSE_ROLE.TA]);
    const submissions = await getPeerReviewSubmissionsForAssessmentById(req.params.assessmentId, userId, userCourseRole);
    res.status(200).json(submissions);
  } catch (error) {
    return handleError(res, error, 'Failed to get peer review submissions for assessment');
  }
};

/* ------------------------------- Peer Review Assessment Results ------------------------------- */
export const getPeerReviewResultsForAssessment = async (req: Request, res: Response) => {
  try {
    const { account, userCourseRole } = await verifyRequestUser(req);
    await verifyRequestPermission(account._id, userCourseRole, [COURSE_ROLE.Faculty, COURSE_ROLE.TA]);
    const resultsDto = await getPeerReviewResultsForAssessmentById(req.params.assessmentId);
    res.status(200).json(resultsDto);
  } catch (error) {
    return handleError(res, error, 'Failed to get peer review results for assessment');
  }
};

/* ------------------------------- Peer Review Assessment Grading ------------------------------- */
export const getPeerReviewSubmissionForGrading = async (req: Request, res: Response) => {
  try {
    const { account, userCourseRole } = await verifyRequestUser(req);
    const userId = await verifyRequestPermission(
      account._id,
      userCourseRole,
      [COURSE_ROLE.Faculty, COURSE_ROLE.TA]
    );

    const gradingDto = await getPeerReviewGradingDTO(
      userId,
      userCourseRole,
      req.params.assessmentId,
      req.params.submissionId
    );

    res.status(200).json(gradingDto);
  } catch (error) {
    return handleError(res, error, 'Failed to get peer review submission for grading');
  }
};

export const getPeerReviewGradingTaskForSubmission = async (req: Request, res: Response) => {
  try {
    const { account, userCourseRole } = await verifyRequestUser(req);
    const userId = await verifyRequestPermission(
      account._id,
      userCourseRole,
      [COURSE_ROLE.Faculty, COURSE_ROLE.TA]
    );

    const gradingDto = await getGradingTaskForSubmissionById(
      userId,
      userCourseRole,
      req.params.assessmentId,
      req.params.submissionId
    );

    res.status(200).json(gradingDto);
  } catch (error) {
    return handleError(res, error, 'Failed to get grading task for submission');
  }
};

export const startGradingTaskForFaculty = async (req: Request, res: Response) => {
  try {
    const { account, userCourseRole } = await verifyRequestUser(req);
    const userId = await verifyRequestPermission(
      account._id,
      userCourseRole,
      [COURSE_ROLE.Faculty]
    );

    const gradingTask = await startGradingTaskForFacultyById(
      userId,
      req.params.assessmentId,
      req.params.submissionId
    );

    res.status(200).json(gradingTask);
  } catch (error) {
    return handleError(res, error, 'Failed to start grading task for faculty');
  }
};

export const updatePeerReviewGradingTask = async (req: Request, res: Response) => {
  try {
    const { account, userCourseRole } = await verifyRequestUser(req);
    const userId = await verifyRequestPermission(
      account._id,
      userCourseRole,
      [COURSE_ROLE.Faculty, COURSE_ROLE.TA]
    );

    const updatedGradingTask = await updateGradingTaskById(
      userId,
      req.params.taskId,
      req.body
    );

    res.status(200).json(updatedGradingTask);
  } catch (error) {
    return handleError(res, error, 'Failed to update peer review grading task');
  }
};

export const submitPeerReviewGradingTask = async (req: Request, res: Response) => {
  try {
    const { account, userCourseRole } = await verifyRequestUser(req);
    const userId = await verifyRequestPermission(
      account._id,
      userCourseRole,
      [COURSE_ROLE.Faculty, COURSE_ROLE.TA]
    );

    const submittedGradingTask = await submitGradingTaskById(
      userId,
      req.params.taskId,
    );

    res.status(200).json(submittedGradingTask);
  } catch (error) {
    return handleError(res, error, 'Failed to submit peer review grading task');
  }
};
