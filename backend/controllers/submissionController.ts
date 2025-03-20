import { Request, Response } from 'express';
import {
  createSubmission,
  updateSubmission,
  deleteSubmission,
  getSubmissionsByAssessmentAndUser,
  getSubmissionsByAssessment,
  adjustSubmissionScore,
  softDeleteSubmissionsByAssessmentId,
} from '../services/submissionService';
import { getAccountId } from '../utils/auth';
import {
  NotFoundError,
  BadRequestError,
  MissingAuthorizationError,
} from '../services/errors';
import AccountModel from '../models/Account';
import SubmissionModel from '../models/Submission';
import { AnswerUnion } from '../models/Answer';
import { getUserIdByAccountId } from '../services/accountService';
import CrispRole from '@shared/types/auth/CrispRole';

/**
 * Controller to submit or update a submission for a particular assessment.
 *
 * @param {Request} req - Express request object
 *  - req.params.assessmentId: The ID of the assessment being submitted to.
 *  - req.body.answers: Array of AnswerUnion representing the user's answers.
 *  - req.body.isDraft: Boolean indicating if this submission is a draft.
 *  - req.body.submissionId: (Optional) ID of an existing submission to update.
 * @param {Response} res - Express response object
 *
 * @returns {Promise<void>}
 *  - 200 OK: Submission saved successfully, returns the submission in JSON format.
 *  - 400 Bad Request: If `answers` is invalid or there's a validation error.
 *  - 401 Unauthorized: If the user is missing valid credentials or is otherwise unauthorized.
 *  - 500 Internal Server Error: If any unknown error occurs during submission.
 *
 * @throws {NotFoundError} If the assessment or user is not found.
 * @throws {BadRequestError} If the provided `answers` are invalid or there's a validation error.
 * @throws {MissingAuthorizationError} If the user is not authorized.
 * @throws {Error} For other unknown runtime or server errors (500).
 */
export const submitAssessment = async (req: Request, res: Response) => {
  try {
    const accountId = await getAccountId(req);
    const userId = await getUserIdByAccountId(accountId);
    const { assessmentId } = req.params;
    const { answers, isDraft, submissionId } = req.body;

    if (!Array.isArray(answers)) {
      throw new BadRequestError('Invalid answers data');
    }

    const typedAnswers: AnswerUnion[] = answers;

    let submission;
    if (submissionId) {
      // Update existing submission
      submission = await updateSubmission(
        submissionId,
        userId,
        accountId,
        typedAnswers,
        isDraft
      );
    } else {
      // Create new submission
      submission = await createSubmission(
        assessmentId,
        userId,
        typedAnswers,
        isDraft
      );
    }

    res
      .status(200)
      .json({ message: 'Submission saved successfully', submission });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof BadRequestError) {
      res.status(400).json({ error: error.message });
    } else if (error instanceof MissingAuthorizationError) {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      console.error('Error submitting assessment:', error);
      res.status(500).json({ error: 'Failed to submit assessment' });
    }
  }
};

/**
 * Controller to get all submissions for a particular user for a given assessment.
 *
 * @param {Request} req - Express request object
 *  - req.params.assessmentId: The ID of the assessment.
 * @param {Response} res - Express response object
 *
 * @returns {Promise<void>}
 *  - 200 OK: Returns an array of Submission objects (scores masked if user is not admin/faculty).
 *  - 404 Not Found: If the submission or account is not found.
 *  - 401 Unauthorized: If the user is missing valid credentials or is otherwise unauthorized.
 *  - 500 Internal Server Error: If any unknown error occurs.
 *
 * @description
 *  - If the user is not an admin or faculty, their submission scores are masked (set to -1).
 *
 * @throws {NotFoundError} If no submission or account is found for the user.
 * @throws {MissingAuthorizationError} If the user is unauthorized.
 * @throws {Error} For other unknown runtime or server errors (500).
 */
export const getUserSubmissions = async (req: Request, res: Response) => {
  try {
    const accountId = await getAccountId(req);
    const account = await AccountModel.findById(accountId);
    if (!account) {
      throw new MissingAuthorizationError('Access denied');
    }
    const { assessmentId } = req.params;
    const userId = await getUserIdByAccountId(accountId);

    const submissions = await getSubmissionsByAssessmentAndUser(
      assessmentId,
      userId
    );
    if (account.crispRole !== CrispRole.Admin && account.crispRole !== CrispRole.Faculty) {
      submissions.forEach(sub => {
        sub.score = -1;
        sub.adjustedScore = -1;
      });
    }
    res.status(200).json(submissions);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof MissingAuthorizationError) {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      console.error('Error retrieving submissions:', error);
      res.status(500).json({ error: 'Failed to retrieve submissions' });
    }
  }
};

/**
 * Controller to retrieve all submissions for a specific assessment.
 * Intended only for admins or faculty members.
 *
 * @param {Request} req - Express request object
 *  - req.params.assessmentId: The ID of the assessment.
 * @param {Response} res - Express response object
 *
 * @returns {Promise<void>}
 *  - 200 OK: Returns an array of Submission objects (scores masked if user is not admin/faculty).
 *  - 403 Forbidden: If the user is not admin/faculty/teaching assistant.
 *  - 500 Internal Server Error: For any unknown runtime or server errors.
 *
 * @description
 *  - If the user is not an admin or faculty, submission scores are masked (set to -1).
 *
 * @throws {MissingAuthorizationError} If the user is not admin/faculty.
 * @throws {Error} For unknown runtime or server errors (500).
 */
export const getAllSubmissions = async (req: Request, res: Response) => {
  try {
    const accountId = await getAccountId(req);
    const account = await AccountModel.findById(accountId);

    if (
      !account ||
      (account.crispRole !== CrispRole.Admin &&
        account.crispRole !== CrispRole.Faculty)
    ) {
      throw new MissingAuthorizationError('Access denied');
    }

    const { assessmentId } = req.params;
    const submissions = await getSubmissionsByAssessment(assessmentId);
    res.status(200).json(submissions);
  } catch (error) {
    if (error instanceof MissingAuthorizationError) {
      res.status(403).json({ error: error.message });
    } else {
      console.error('Error retrieving submissions:', error);
      res.status(500).json({ error: 'Failed to retrieve submissions' });
    }
  }
};

/**
 * Controller to delete a user's submission.
 *
 * @param {Request} req - Express request object
 *  - req.params.submissionId: The ID of the submission to delete.
 * @param {Response} res - Express response object
 *
 * @returns {Promise<void>}
 *  - 200 OK: Indicates successful deletion.
 *  - 404 Not Found: If the submission is not found.
 *  - 403 Forbidden: If the user lacks permission to delete (not the owner nor an admin nor faculty).
 *  - 500 Internal Server Error: For any unknown runtime or server errors.
 *
 * @description
 *  - If the requesting user does not own the submission and is not an admin, they cannot delete it.
 *
 * @throws {NotFoundError} If the submission is not found.
 * @throws {MissingAuthorizationError} If the user is unauthorized to delete it.
 * @throws {Error} For any unknown runtime or server errors (500).
 */
export const deleteUserSubmission = async (req: Request, res: Response) => {
  try {
    const accountId = await getAccountId(req);
    const userId = await getUserIdByAccountId(accountId);
    const { submissionId } = req.params;

    const submission = await SubmissionModel.findById(submissionId);

    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    if (!submission.user.equals(userId)) {
      const account = await AccountModel.findById(accountId);
      if (!account || account.crispRole !== CrispRole.Admin) {
        throw new MissingAuthorizationError(
          'You do not have permission to delete this submission'
        );
      }
    }

    await deleteSubmission(userId, submissionId);
    res.status(200).json({ message: 'Submission deleted successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof MissingAuthorizationError) {
      res.status(403).json({ error: error.message });
    } else {
      console.error('Error deleting submission:', error);
      res.status(500).json({ error: 'Failed to delete submission' });
    }
  }
};

/**
 * Controller to bulk soft delete all submissions for a specific assessment.
 *
 * @param {Request} req - Express request object
 *  - req.params.assessmentId: The ID of the assessment whose submissions are to be deleted.
 * @param {Response} res - Express response object
 *
 * @returns {Promise<void>}
 *  - 200 OK: Returns a success message and the number of submissions deleted.
 *  - 404 Not Found: If the assessment is not found.
 *  - 403 Forbidden: If the user lacks the necessary permissions.
 *  - 500 Internal Server Error: For any unknown runtime or server errors.
 *
 * @throws {NotFoundError} If the assessment is not found.
 * @throws {MissingAuthorizationError} If the user is unauthorized.
 * @throws {Error} For unknown runtime or server errors (500).
 */
export const bulkDeleteSubmissionsByAssessment = async (
  req: Request,
  res: Response
) => {
  try {
    const accountId = await getAccountId(req);
    const account = await AccountModel.findById(accountId);

    if (
      !account ||
      (account.crispRole !== CrispRole.Admin && account.crispRole !== CrispRole.Faculty)
    ) {
      throw new MissingAuthorizationError(
        'You do not have permission to perform this action.'
      );
    }

    const { assessmentId } = req.params;

    const userId = await getUserIdByAccountId(accountId);

    const deletedCount = await softDeleteSubmissionsByAssessmentId(
      userId,
      assessmentId
    );

    res.status(200).json({
      message: `Successfully soft-deleted ${deletedCount} submission(s) for Assessment ${assessmentId}.`,
      deletedCount,
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof BadRequestError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof MissingAuthorizationError) {
      res.status(403).json({ error: error.message });
    } else {
      console.error('Error bulk deleting submissions:', error);
      res.status(500).json({ error: 'Failed to bulk delete submissions.' });
    }
  }
};

/**
 * Controller method to retrieve a submission by its ID.
 *
 * @param {Request} req - Express request object
 *  - req.params.submissionId: The ID of the submission to retrieve.
 * @param {Response} res - Express response object
 *
 * @returns {Promise<void>}
 *  - 200 OK: Successfully returns the submission in JSON format.
 *  - 404 Not Found: If the submission does not exist.
 *  - 403 Forbidden: If the user is not the submission owner nor an admin/faculty.
 *  - 500 Internal Server Error: For any unknown runtime or server errors.
 *
 * @description
 *  - Populates the submission's user and assessment fields.
 *  - If the requesting user is not the submission owner and is not admin/faculty, an error is thrown.
 *
 * @throws {NotFoundError} If the submission is not found.
 * @throws {MissingAuthorizationError} If the user lacks permission to view it.
 * @throws {Error} For any unknown runtime or server errors (500).
 */
export const getSubmissionByIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const accountId = await getAccountId(req);
    const userId = await getUserIdByAccountId(accountId);
    const { submissionId } = req.params;

    const submission = await SubmissionModel.findById(submissionId)
      .populate('user')
      .populate('assessment');

    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    // Ensure the user has permission to view the submission
    if (!submission.user.equals(userId)) {
      const account = await AccountModel.findById(accountId);
      if (
        !account ||
        (account.crispRole !== CrispRole.Admin && account.crispRole !== CrispRole.Faculty)
      ) {
        throw new MissingAuthorizationError(
          'You do not have permission to view this submission'
        );
      }
    }

    res.status(200).json(submission);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof MissingAuthorizationError) {
      res.status(403).json({ error: error.message });
    } else {
      console.error('Error retrieving submission:', error);
      res.status(500).json({ error: 'Failed to retrieve submission' });
    }
  }
};

/**
 * Controller to adjust the score of a submission.
 * Accessible only by faculty members and admins.
 *
 * @param {Request} req - Express request object
 *  - req.params.submissionId: The ID of the submission to adjust.
 *  - req.body.adjustedScore: The new adjusted score.
 * @param {Response} res - Express response object
 *
 * @returns {Promise<void>}
 *  - 200 OK: Returns a success message and the updated submission.
 *  - 400 Bad Request: If the adjusted score is invalid.
 *  - 403 Forbidden: If the user lacks permission to adjust scores.
 *  - 500 Internal Server Error: For unknown runtime or server errors (500).
 *
 * @throws {NotFoundError} If the submission is not found.
 * @throws {BadRequestError} If the adjusted score is invalid.
 * @throws {MissingAuthorizationError} If the user is unauthorized.
 * @throws {Error} For unknown runtime or server errors (500).
 */
export const adjustSubmissionScoreController = async (
  req: Request,
  res: Response
) => {
  try {
    const accountId = await getAccountId(req);
    const account = await AccountModel.findById(accountId);

    if (
      !account ||
      (account.crispRole !== CrispRole.Faculty && account.crispRole !== CrispRole.Admin)
    ) {
      throw new MissingAuthorizationError(
        'You do not have permission to adjust scores.'
      );
    }

    const { submissionId } = req.params;
    const { adjustedScore } = req.body;

    if (typeof adjustedScore !== 'number' || adjustedScore < 0) {
      throw new BadRequestError('Invalid adjusted score.');
    }

    const submission = await adjustSubmissionScore(submissionId, adjustedScore);

    res
      .status(200)
      .json({ message: 'Adjusted score submitted successfully.', submission });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof BadRequestError) {
      res.status(400).json({ error: error.message });
    } else if (error instanceof MissingAuthorizationError) {
      res.status(403).json({ error: error.message });
    } else {
      console.error('Error adjusting submission score:', error);
      res.status(500).json({ error: 'Failed to adjust submission score.' });
    }
  }
};
