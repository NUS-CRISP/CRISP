import express from 'express';
import {
  getPeerReviewByAssessment,
  getPeerReviewSubmissionsForAssessment,
  createPeerReviewAssessment,
  updatePeerReviewAssessment,
  deletePeerReviewAssessment,
} from '../controllers/peerReviewAssessmentController';

const router = express.Router();

// Peer Review-related Routes
router.get('/:courseId/:assessmentId', getPeerReviewByAssessment);
router.get('/:courseId/:assessmentId/submissions', getPeerReviewSubmissionsForAssessment);
router.post('/:courseId/peer-review', createPeerReviewAssessment);
router.put('/:courseId/:assessmentId/peer-review', updatePeerReviewAssessment);
router.delete('/:courseId/:assessmentId/peer-review', deletePeerReviewAssessment);

export default router;
