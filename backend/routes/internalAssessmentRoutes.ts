import express from 'express';
import {
  getInternalAssessment,
  updateInternalAssessment,
  deleteInternalAssessment,
  uploadInternalResults,
  updateInternalResultMarker,
  addQuestionToAssessmentController,
  getQuestionsByAssessmentIdController,
  updateQuestionByIdController,
  deleteQuestionByIdController,
  recallInternalAssessment,
  releaseInternalAssessment,
} from '../controllers/internalAssessmentController';

const router = express.Router();

router.get('/:assessmentId', getInternalAssessment);
router.patch('/:assessmentId', updateInternalAssessment);
router.delete('/:assessmentId', deleteInternalAssessment);
router.post('/:assessmentId/results/', uploadInternalResults);
router.patch('/:assessmentId/results/:resultId/marker', updateInternalResultMarker);
router.post('/:assessmentId/questions', addQuestionToAssessmentController);
router.get('/:assessmentId/questions', getQuestionsByAssessmentIdController);
router.patch('/:assessmentId/questions/:questionId', updateQuestionByIdController);
router.delete('/:assessmentId/questions/:questionId', deleteQuestionByIdController);
router.post('/:assessmentId/release', releaseInternalAssessment);
router.post('/:assessmentId/recall', recallInternalAssessment);

export default router;
