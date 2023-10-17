import express from 'express';
import {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourseById,
  deleteCourseById,
  addStudents,
  addTeams,
  addTAs,
  addMilestone,
  addSprint,
  addTeamSet,
  addAssessment,
} from '../controllers/courseController';

const router = express.Router();

router.post('/', createCourse);
router.get('/', getAllCourses);
router.get('/:id', getCourseById);
router.put('/:id', updateCourseById);
router.delete('/:id', deleteCourseById);
router.post('/:id/students', addStudents);
router.post('/:id/teams', addTeams);
router.post('/:id/tas', addTAs);
router.post('/:id/milestones', addMilestone);
router.post('/:id/sprints', addSprint);
router.post('/:id/teamsets', addTeamSet);
router.post('/:id/assessments', addAssessment);

export default router;
