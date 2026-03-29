import express from 'express';
import {
  getAllPeerReviews,
  getPeerReviewInfo,
  getPeerReviewProgressOverview,
  updatePeerReview,
  deletePeerReview,
  getUnassignedReviewersInfo,
  startPeerReview,
} from '../controllers/peerReviewController';
import {
  getPeerReviewAssignment,
  postAssignPeerReviews,
  postAddManualAssignment,
  deleteManualAssignment,
} from '../controllers/peerReviewAssignmentController';
import {
  getPeerReviewCommentsById,
  addPeerReviewComment,
  updatePeerReviewComment,
  deletePeerReviewComment,
  flagPeerReviewComment,
} from '../controllers/peerReviewCommentsController';
import {
  getSubmissionsForAssignment,
  putMySubmissionDraft,
  postSubmitMySubmission,
} from '../controllers/peerReviewSubmissionController';

const router = express.Router();

// Peer Review Routes
router.get('/:courseId/peer-reviews', getAllPeerReviews);
router.put('/:courseId/:peerReviewId', updatePeerReview);
router.delete('/:courseId/:peerReviewId', deletePeerReview);
router.get('/:courseId/:peerReviewId', getPeerReviewInfo);
router.post('/:courseId/:peerReviewId/start', startPeerReview);
router.get(
  '/:courseId/:peerReviewId/unassigned-reviewers',
  getUnassignedReviewersInfo
);
router.get(
  '/:courseId/:peerReviewId/progress-overview',
  getPeerReviewProgressOverview
);

// Peer Review Assignment Routes
router.get(
  '/:courseId/:peerReviewAssignmentId/assignment',
  getPeerReviewAssignment
);
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
router.put(
  '/:courseId/:peerReviewAssignmentId/comments/:commentId/flag',
  flagPeerReviewComment
);

// Peer Review Submission Routes
router.get(
  '/:courseId/:peerReviewAssignmentId/submissions',
  getSubmissionsForAssignment
);
router.put(
  '/:courseId/:peerReviewAssignmentId/submissions',
  putMySubmissionDraft
);
router.post(
  '/:courseId/:peerReviewAssignmentId/submissions/submit',
  postSubmitMySubmission
);

export default router;
