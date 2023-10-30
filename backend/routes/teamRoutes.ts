import express from 'express';
import { deleteTeam, updateTeam } from '../controllers/teamController';

const router = express.Router();

router.delete('/:id', deleteTeam);
router.patch('/:id', updateTeam);

export default router;
