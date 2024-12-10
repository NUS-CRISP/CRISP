// controllers/submissionController.ts

import { Request, Response } from 'express';
import {
  createSubmission,
  updateSubmission,
  deleteSubmission,
  getSubmissionsByAssessmentAndUser,
  getSubmissionsByAssessment,
  adjustSubmissionScore,
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
    if (account.role !== 'admin' && account.role !== 'Faculty member') {
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

export const getAllSubmissions = async (req: Request, res: Response) => {
  try {
    const accountId = await getAccountId(req);
    const account = await AccountModel.findById(accountId);

    if (
      !account ||
      (account.role !== 'admin' && account.role !== 'Faculty member')
    ) {
      throw new MissingAuthorizationError('Access denied');
    }

    const { assessmentId } = req.params;
    const submissions = await getSubmissionsByAssessment(assessmentId);
    if (account.role !== 'admin' && account.role !== 'Faculty member') {
      submissions.forEach(sub => {
        sub.score = -1;
        sub.adjustedScore = -1;
      });
    }
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
      if (!account || account.role !== 'admin') {
        throw new MissingAuthorizationError(
          'You do not have permission to delete this submission'
        );
      }
    }

    await deleteSubmission(submissionId);
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

// New controller to get a submission by ID
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
        (account.role !== 'admin' && account.role !== 'Faculty member')
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
 * Only accessible by faculty members and admins.
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
      (account.role !== 'Faculty member' && account.role !== 'admin')
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
