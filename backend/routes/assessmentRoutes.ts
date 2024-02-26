import express from 'express';
import {
  getAssessment,
  uploadResults,
  updateResultMarker,
  getSheetData,
  fetchNewSheetData,
} from '../controllers/assessmentController';

const router = express.Router();

router.get('/:assessmentId', getAssessment);
router.post('/:assessmentId/results/', uploadResults);
router.patch('/:assessmentId/results/:resultId/marker', updateResultMarker);
router.get('/:id/googlesheets', getSheetData);
router.post('/:id/googlesheets', fetchNewSheetData);

export default router;
