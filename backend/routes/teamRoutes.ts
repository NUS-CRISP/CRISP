import express from 'express';
import {
  deleteTeam,
  updateTeam,
  removeMembersFromTeam,
} from '../controllers/teamController';

const router = express.Router();

router.delete('/:id', deleteTeam);
router.patch('/:id', updateTeam);
router.delete('/:id/members/:userId', removeMembersFromTeam);

export default router;
