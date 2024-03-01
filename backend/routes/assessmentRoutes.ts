import express from 'express';
import {
  getAssessment,
  updateAssessment,
  deleteAssessment,
  uploadResults,
  updateResultMarker,
  getSheetData,
  fetchNewSheetData,
} from '../controllers/assessmentController';

const router = express.Router();

router.get('/:assessmentId', getAssessment);
router.patch('/:assessmentId', updateAssessment);
router.delete('/:assessmentId', deleteAssessment);
router.post('/:assessmentId/results/', uploadResults);
router.patch('/:assessmentId/results/:resultId/marker', updateResultMarker);
router.get('/:assessmentId/googlesheets', getSheetData);
router.post('/:assessmentId/googlesheets', fetchNewSheetData);

export default router;
