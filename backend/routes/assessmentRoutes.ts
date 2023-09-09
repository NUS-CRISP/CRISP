import express from 'express';
import {
  createAssessment,
  getAllAssessments,
  getAssessmentById,
  updateAssessmentById,
  deleteAssessmentById,
} from '../controllers/AssessmentController';

const router = express.Router();

router.post('/', createAssessment);
router.get('/', getAllAssessments);
router.get('/:id', getAssessmentById);
router.put('/:id', updateAssessmentById);
router.delete('/:id', deleteAssessmentById);

export default router;
