import express from 'express';
import {
  createAssignmentSetController,
  getAssignmentSetController,
  updateAssignmentSetController,
  getAssignmentsByTAIdController,
  getUnmarkedAssignmentsByTAIdController,
} from '../controllers/assessmentAssignmentSetController';

const router = express.Router();

// Assignment Set Routes
router.post('/:assessmentId/assignment-sets', createAssignmentSetController);
router.get('/:assessmentId/assignment-sets', getAssignmentSetController);
router.patch('/:assessmentId/assignment-sets', updateAssignmentSetController);

// TA Assignment Routes
router.get('/:assessmentId/assignment-sets/ta', getAssignmentsByTAIdController);
router.get(
  '/:assessmentId/assignment-sets/taunmarked',
  getUnmarkedAssignmentsByTAIdController
);

export default router;
