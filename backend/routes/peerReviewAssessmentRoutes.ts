import express from 'express';
import {
  getPeerReviewByAssessment,
  getPeerReviewSubmissionsForAssessment,
  getPeerReviewResultsForAssessment,
  getPeerReviewSubmissionForGrading,
  createPeerReviewAssessment,
  updatePeerReviewAssessment,
  deletePeerReviewAssessment,
  getPeerReviewGradingTaskForSubmission,
  startGradingTaskForFaculty,
  updatePeerReviewGradingTask,
  submitPeerReviewGradingTask,
} from '../controllers/peerReviewAssessmentController';

const router = express.Router();

// Peer Review Assessment CRUD
router.get('/:courseId/:assessmentId', getPeerReviewByAssessment);
router.post('/:courseId/peer-review', createPeerReviewAssessment);
router.put('/:courseId/:assessmentId/peer-review', updatePeerReviewAssessment);
router.delete('/:courseId/:assessmentId/peer-review', deletePeerReviewAssessment);

// Peer Review Assessment Submissions
router.get('/:courseId/:assessmentId/submissions', getPeerReviewSubmissionsForAssessment);

// Peer Review Assessment Results
router.get('/:courseId/:assessmentId/results', getPeerReviewResultsForAssessment);

// Peer Review Assessment Grading
router.get('/:courseId/:assessmentId/submissions/:submissionId', getPeerReviewSubmissionForGrading);
router.get('/:courseId/:assessmentId/submissions/:submissionId/grading-task', getPeerReviewGradingTaskForSubmission);
router.post('/:courseId/:assessmentId/submissions/:submissionId/start-grading', startGradingTaskForFaculty);
router.patch('/:courseId/:assessmentId/grading-tasks/:taskId', updatePeerReviewGradingTask);
router.post('/:courseId/:assessmentId/grading-tasks/:taskId/submit', submitPeerReviewGradingTask);

export default router;
