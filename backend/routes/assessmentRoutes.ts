import express from 'express';
import { getAssessmentById } from '../controllers/assessmentController';

const router = express.Router();

router.get('/:id', getAssessmentById);

export default router;
