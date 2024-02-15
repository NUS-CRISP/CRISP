import express from 'express';
import {
  addAssessments,
  addMilestone,
  addSprint,
  addStudents,
  addStudentsToTeams,
  addTAs,
  addTAsToTeams,
  addTeamSet,
  createCourse,
  deleteCourse,
  fetchNewSheetsData,
  getCourses,
  getCourse,
  getSheetsData,
  getTeachingTeam,
  updateCourse,
} from '../controllers/courseController';

const router = express.Router();

router.post('/', createCourse);
router.get('/', getCourses);
router.get('/:id', getCourse);
router.put('/:id', updateCourse);
router.delete('/:id', deleteCourse);
router.post('/:id/students', addStudents);
router.post('/:id/tas', addTAs);
router.post('/:id/teamsets', addTeamSet);
router.post('/:id/teams/students', addStudentsToTeams);
router.post('/:id/teams/tas', addTAsToTeams);
router.get('/:id/teachingteam', getTeachingTeam);
router.post('/:id/milestones', addMilestone);
router.post('/:id/sprints', addSprint);
router.post('/:id/assessments', addAssessments);
router.get('/:id/googlesheets', getSheetsData);
router.post('/:id/googlesheets', fetchNewSheetsData);

export default router;
