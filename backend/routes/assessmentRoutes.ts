import express from 'express';
import {
  getAssessment,
  uploadResults,
  updateResultMarker,
} from '../controllers/assessmentController';

const router = express.Router();

router.get('/:assessmentId', getAssessment);
router.post('/:assessmentId/results/', uploadResults);
router.patch('/:assessmentId/results/:resultId/marker', updateResultMarker);

export default router;
