import express from 'express';
import {
  adjustSubmissionScoreController,
  bulkDeleteSubmissionsByAssessment,
  deleteUserSubmission,
  getSubmissionByIdController,
} from '../controllers/submissionController';

const router = express.Router();

router.get('/:submissionId', getSubmissionByIdController);
router.delete('/:submissionId', deleteUserSubmission);
router.post('/:submissionId/adjust-score', adjustSubmissionScoreController);
router.delete('/bulk-delete/:assessmentId', bulkDeleteSubmissionsByAssessment);

export default router;
