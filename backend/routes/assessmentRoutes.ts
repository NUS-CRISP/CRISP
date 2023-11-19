import express from 'express';
import {
  getAssessmentById,
  uploadResults,
  updateResultMarker,
} from '../controllers/assessmentController';

const router = express.Router();

router.get('/:assessmentId', getAssessmentById);
router.post('/:assessmentId/results/', uploadResults);
router.patch('/:assessmentId/results/:resultId/marker', updateResultMarker);

export default router;
