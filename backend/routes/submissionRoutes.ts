// routes/submissionRoutes.ts

import express from 'express';
import {
  adjustSubmissionScoreController,
  deleteUserSubmission,
  getSubmissionByIdController,
} from '../controllers/submissionController';

const router = express.Router();

router.get('/:submissionId', getSubmissionByIdController);
router.delete('/:submissionId', deleteUserSubmission);
router.post('/:submissionId/adjust-score', adjustSubmissionScoreController);

export default router;
