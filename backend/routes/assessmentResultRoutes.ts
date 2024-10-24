// routes/assessmentResultRoutes.ts

import express from 'express';
import {
  getOrCreateAssessmentResultsController,
  recalculateResultController,
  checkMarkingCompletionController,
} from '../controllers/assessmentResultController';

const router = express.Router();

/**
 * @route   GET /api/assessment-results/:assessmentId
 * @desc    Retrieve or create AssessmentResults for an assessment
 */
router.get('/:assessmentId', getOrCreateAssessmentResultsController);

/**
 * @route   POST /api/assessment-results/:resultId/recalculate
 * @desc    Recalculate the average score for an AssessmentResult
 */
router.post('/:resultId/recalculate', recalculateResultController);

/**
 * @route   GET /api/assessment-results/:assessmentId/check-marking-completion
 * @desc    Check marking completion status for an assessment
 */
router.get('/:assessmentId/check-marking-completion', checkMarkingCompletionController);

export default router;
