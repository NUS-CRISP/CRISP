import express from 'express';
import {
  addAssessments,
  getCourseCode,
  addFaculty,
  addMilestone,
  addSprint,
  addStudents,
  addStudentsToTeams,
  addTAs,
  addTAsToTeams,
  addTeamSet,
  createCourse,
  deleteCourse,
  getCourse,
  getCourses,
  getTeachingTeam,
  removeFaculty,
  removeStudents,
  removeTAs,
  updateCourse,
} from '../controllers/courseController';
import { noCache } from '../middleware/noCache';

const router = express.Router();

router.post('/', createCourse);
router.get('/', noCache, getCourses);
router.get('/:id', getCourse);
router.put('/:id', updateCourse);
router.delete('/:id', deleteCourse);
router.get('/:id/code', getCourseCode);
router.post('/:id/faculty', addFaculty);
router.delete('/:id/faculty/:userId', removeFaculty);
router.post('/:id/students', addStudents);
router.delete('/:id/students/:userId', removeStudents);
router.post('/:id/tas', addTAs);
router.delete('/:id/tas/:userId', removeTAs);
router.post('/:id/teamsets', addTeamSet);
router.post('/:id/teams/students', addStudentsToTeams);
router.post('/:id/teams/tas', addTAsToTeams);
router.get('/:id/teachingteam', getTeachingTeam);
router.post('/:id/milestones', addMilestone);
router.post('/:id/sprints', addSprint);
router.post('/:id/assessments', addAssessments);

export default router;
