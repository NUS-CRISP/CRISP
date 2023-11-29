import { Request, Response } from 'express';
import { deleteTeamById, updateTeamById } from '../services/teamService';

export const deleteTeam = async (req: Request, res: Response) => {
  const teamId = req.params.id;
  try {
    await deleteTeamById(teamId);
    return res.status(200).json({ message: 'Team deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete the team' });
  }
};

export const updateTeam = async (req: Request, res: Response) => {
  const teamId = req.params.id;
  try {
    const updatedTeam = await updateTeamById(teamId, req.body);
    res.json(updatedTeam);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update team' });
  }
};
