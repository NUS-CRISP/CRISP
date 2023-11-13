import express from 'express';
import {
  getAssessmentById,
  updateResultMarker,
} from '../controllers/assessmentController';

const router = express.Router();

router.get('/:id', getAssessmentById);
router.patch('/:assessmentId/results/:resultId/marker', updateResultMarker);

export default router;
