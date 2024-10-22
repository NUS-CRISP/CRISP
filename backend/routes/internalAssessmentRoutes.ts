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
import {
  submitAssessment,
  getUserSubmissions,
  getAllSubmissions,
} from '../controllers/submissionController';
import {
  createAssignmentSetController,
  getAssignmentSetController,
  updateAssignmentSetController,
  deleteAssignmentSetController,
  getAssignmentsByTAIdController,
} from '../controllers/assessmentAssignmentSetController';

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
router.post('/:assessmentId/submit', submitAssessment);
router.get('/:assessmentId/submissions', getUserSubmissions);
router.get('/:assessmentId/all-submissions', getAllSubmissions);
router.post('/:assessmentId/assignment-sets', createAssignmentSetController);
router.get('/:assessmentId/assignment-sets', getAssignmentSetController);
router.patch('/:assessmentId/assignment-sets', updateAssignmentSetController);
router.delete('/:assessmentId/assignment-sets', deleteAssignmentSetController);
router.get('/:assessmentId/assignment-sets/tas/:taId', getAssignmentsByTAIdController);

export default router;
