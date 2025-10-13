import express from 'express';
import {
  getAllPeerReviews,
  createPeerReview,
  deletePeerReview,
  getPeerReviewSettings,
  updatePeerReviewSettings,
} from '../controllers/peerReviewController';
import {
  getPeerReviewInfo,
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
router.get('/:courseId/:peerReviewId', getPeerReviewInfo);
router.get(
  '/:courseId/:peerReviewId/assignments',
  getPeerReviewAssignmentsByPeerReview
);
router.get(
  '/:courseId/:peerReviewId/assignments/:teamId',
  getPeerReviewAssignmentsByTeam
);
router.post('/:courseId/:peerReviewId/assign-assignments', assignPeerReview);
router.post(
  '/:courseId/:peerReviewId/random-assignments',
  randomAssignPeerReviews
);
router.get('/:courseId/:peerReviewAssignmentId', getPeerReviewAssignment);

// Peer Review Comment Routes
router.get(
  '/:courseId/:peerReviewAssignmentId/comments',
  getPeerReviewCommentsById
);
router.post(
  '/:courseId/:peerReviewAssignmentId/comments',
  addPeerReviewComment
);
router.put(
  '/:courseId/:peerReviewAssignmentId/comments/:commentId',
  updatePeerReviewComment
);
router.delete(
  '/:courseId/:peerReviewAssignmentId/comments/:commentId',
  deletePeerReviewComment
);

export default router;
