import express from 'express';
import {
  deleteTeam,
  getTeamsByCourse,
  removeMembersFromTeam,
  updateTeam,
} from '../controllers/teamController';

const router = express.Router();

router.get('/course/:courseId', getTeamsByCourse);
router.delete('/:id', deleteTeam);
router.patch('/:id', updateTeam);
router.delete('/:id/members/:userId', removeMembersFromTeam);

export default router;
