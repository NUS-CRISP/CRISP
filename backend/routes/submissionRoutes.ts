// routes/submissionRoutes.ts

import express from 'express';
import {
  deleteUserSubmission,
  getSubmissionByIdController,
} from '../controllers/submissionController';

const router = express.Router();

router.get('/:submissionId', getSubmissionByIdController);
router.delete('/:submissionId', deleteUserSubmission);

export default router;
