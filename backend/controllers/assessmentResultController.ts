// controllers/assessmentResultController.ts

import { Request, Response } from 'express';
import {
  getOrCreateAssessmentResults,
  recalculateResult,
  checkMarkingCompletion,
} from '../services/assessmentResultService';
import { BadRequestError, NotFoundError } from '../services/errors';

/**
 * Controller to retrieve or create AssessmentResults for an assessment.
 * Route: GET /api/assessment-results/:assessmentId
 */
export const getOrCreateAssessmentResultsController = async (
  req: Request,
  res: Response,
) => {
  const { assessmentId } = req.params;

  try {
    const assessmentResults = await getOrCreateAssessmentResults(assessmentId);
    res.status(200).json({
      success: true,
      data: assessmentResults,
    });
  } catch (error) {
    if (error instanceof BadRequestError) {
      res.status(400).json({ error: error.message });
    } else if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error retrieving or creating AssessmentResults:', error);
      res.status(500).json({ error: 'Failed to retrieve or create AssessmentResults' });
    }
  }
};

/**
 * Controller to recalculate the average score of an AssessmentResult.
 * Route: POST /api/assessment-results/:resultId/recalculate
 */
export const recalculateResultController = async (
  req: Request,
  res: Response,
) => {
  const { resultId } = req.params;

  try {
    await recalculateResult(resultId);
    res.status(200).json({
      success: true,
      message: 'Average score recalculated successfully.',
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error recalculating AssessmentResult:', error);
      res.status(500).json({ error: 'Failed to recalculate AssessmentResult' });
    }
  }
};

/**
 * Controller to check marking completion for an assessment.
 * Route: GET /api/assessment-results/:assessmentId/check-marking-completion
 */
export const checkMarkingCompletionController = async (
  req: Request,
  res: Response,
) => {
  const { assessmentId } = req.params;

  try {
    const unmarkedTeams = await checkMarkingCompletion(assessmentId);
    res.status(200).json({
      success: true,
      data: unmarkedTeams,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error checking marking completion:', error);
      res.status(500).json({ error: 'Failed to check marking completion' });
    }
  }
};
