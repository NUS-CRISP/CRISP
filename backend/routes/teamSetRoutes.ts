import express from 'express';
import {
  createTeamSet,
  getAllTeamSets,
  getTeamSetById,
  updateTeamSetById,
  deleteTeamSetById,
} from '../controllers/teamSetController';

const router = express.Router();

router.post('/', createTeamSet);
router.get('/', getAllTeamSets);
router.get('/:id', getTeamSetById);
router.put('/:id', updateTeamSetById);
router.delete('/:id', deleteTeamSetById);

export default router;
