import express from 'express';
import {
  getInternalAssessment,
  updateInternalAssessment,
  deleteInternalAssessment,
  addQuestionToAssessmentController,
  getQuestionsByAssessmentIdController,
  updateQuestionByIdController,
  deleteQuestionByIdController,
  recallInternalAssessment,
  releaseInternalAssessment,
  addQuestionsToAssessmentController,
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
  getAssignmentsByTAIdController,
} from '../controllers/assessmentAssignmentSetController';

const router = express.Router();

router.get('/:assessmentId', getInternalAssessment);
router.patch('/:assessmentId', updateInternalAssessment);
router.delete('/:assessmentId', deleteInternalAssessment);
router.post('/:assessmentId/questions', addQuestionToAssessmentController);
router.post('/:assessmentId/manyquestions', addQuestionsToAssessmentController);
router.get('/:assessmentId/questions', getQuestionsByAssessmentIdController);
router.patch(
  '/:assessmentId/questions/:questionId',
  updateQuestionByIdController
);
router.delete(
  '/:assessmentId/questions/:questionId',
  deleteQuestionByIdController
);
router.post('/:assessmentId/release', releaseInternalAssessment);
router.post('/:assessmentId/recall', recallInternalAssessment);
router.post('/:assessmentId/submit', submitAssessment);
router.get('/:assessmentId/submissions', getUserSubmissions);
router.get('/:assessmentId/all-submissions', getAllSubmissions);
router.post('/:assessmentId/assignment-sets', createAssignmentSetController);
router.get('/:assessmentId/assignment-sets', getAssignmentSetController);
router.patch('/:assessmentId/assignment-sets', updateAssignmentSetController);
router.get(
  '/:assessmentId/assignment-sets/tas/:taId',
  getAssignmentsByTAIdController
);

export default router;
