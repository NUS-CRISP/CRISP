import express from 'express';
import {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourseById,
  deleteCourseById,
  addStudents,
  addTAs,
  addTeamSet,
  addStudentsToTeams,
  addTAsToTeams,
  addMilestone,
  addSprint,
  addAssessments,
} from '../controllers/courseController';

const router = express.Router();

router.post('/', createCourse);
router.get('/', getAllCourses);
router.get('/:id', getCourseById);
router.put('/:id', updateCourseById);
router.delete('/:id', deleteCourseById);
router.post('/:id/students', addStudents);
router.post('/:id/tas', addTAs);
router.post('/:id/teamsets', addTeamSet);
router.post('/:id/teams/students', addStudentsToTeams);
router.post('/:id/teams/tas', addTAsToTeams);
router.post('/:id/milestones', addMilestone);
router.post('/:id/sprints', addSprint);

router.post('/:id/assessments', addAssessments);

export default router;
