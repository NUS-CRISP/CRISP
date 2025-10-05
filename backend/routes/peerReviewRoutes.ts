import express from 'express';
import {
  getAllPeerReviews,
  createPeerReview,
  deletePeerReview,
  getPeerReviewSettings,
  updatePeerReviewSettings,
} from '../controllers/peerReviewController';
import {
  getPeerReviewAssignmentsByPeerReview,
  getPeerReviewAssignmentsByTeam,
  getPeerReviewAssignment,
  assignPeerReview,
  randomAssignPeerReviews,
} from '../controllers/peerReviewAssignmentController';
import {
  getPeerReviewCommentsById,
  addPeerReviewComment,
  updatePeerReviewComment,
  deletePeerReviewComment,
} from '../controllers/peerReviewCommentsController';

const router = express.Router();

// Peer Review Routes
router.get('/:courseId/peer-reviews', getAllPeerReviews);
router.post('/:courseId/peer-reviews', createPeerReview);
router.delete('/:courseId/:peerReviewId', deletePeerReview);
router.get('/:courseId/:peerReviewId/settings', getPeerReviewSettings);
router.put('/:courseId/:peerReviewId/settings', updatePeerReviewSettings);

// Peer Review Assignment Routes
router.get('/:peerReviewId/assignments', getPeerReviewAssignmentsByPeerReview);
router.get('/:peerReviewId/:teamId', getPeerReviewAssignmentsByTeam);
router.get('/:peerReviewId/:peerReviewAssignmentId', getPeerReviewAssignment);
router.post('/:peerReviewId/assignments/assign', assignPeerReview);
router.post('/:peerReviewId/assignments/random', randomAssignPeerReviews);

// Peer Review Comment Routes
router.get('/:peerReviewAssignmentId/comments', getPeerReviewCommentsById);
router.post('/:peerReviewAssignmentId/comments', addPeerReviewComment);
router.put('/:peerReviewAssignmentId/:commentId', updatePeerReviewComment);
router.delete('/:peerReviewAssignmentId/:commentId', deletePeerReviewComment);

export default router;
