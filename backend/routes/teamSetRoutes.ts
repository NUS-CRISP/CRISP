import express from 'express';
import { deleteTeamSet } from '../controllers/teamSetController';

const router = express.Router();

router.delete('/:id', deleteTeamSet);

export default router;
