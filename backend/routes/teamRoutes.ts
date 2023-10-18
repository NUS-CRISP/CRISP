import express from 'express';
import { deleteTeam } from '../controllers/teamContoller';

const router = express.Router();

router.delete('/:id', deleteTeam);

export default router;