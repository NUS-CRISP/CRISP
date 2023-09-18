import express from 'express';
import {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourseById,
  deleteCourseById,
  addStudentsToCourse,
  addMilestone,
  addSprint,
  addTeamSet
} from '../controllers/courseController';

const router = express.Router();

router.post('/', createCourse);
router.get('/', getAllCourses);
router.get('/:id', getCourseById);
router.put('/:id', updateCourseById);
router.delete('/:id', deleteCourseById);
router.post('/:id/students', addStudentsToCourse);
router.post('/:id/milestones', addMilestone);
router.post('/:id/sprints', addSprint);
router.post('/:id/teamsets', addTeamSet)

export default router;