import express from 'express';
import {
  getAllPeerReviews,
  createPeerReview,
  updatePeerReview,
  deletePeerReview,
} from '../controllers/peerReviewController';
import {
  getPeerReviewInfo,
  postAssignPeerReviews,
  postAddManualAssignment,
  deleteManualAssignment,
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
router.put('/:courseId/:peerReviewId', updatePeerReview);
router.delete('/:courseId/:peerReviewId', deletePeerReview);

// Peer Review Assignment Routes
router.get('/:courseId/:peerReviewId', getPeerReviewInfo);
router.post(
  '/:courseId/:peerReviewId/assign-peer-reviews',
  postAssignPeerReviews
);
router.post('/:courseId/:peerReviewId/manual-assign', postAddManualAssignment);
router.delete(
  '/:courseId/:peerReviewId/manual-assign/:revieweeId/:reviewerId',
  deleteManualAssignment
);

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
