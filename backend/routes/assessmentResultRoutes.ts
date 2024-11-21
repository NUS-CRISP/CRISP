// routes/assessmentResultRoutes.ts

import express from 'express';
import {
  getOrCreateAssessmentResultsController,
  recalculateResultController,
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

export default router;
