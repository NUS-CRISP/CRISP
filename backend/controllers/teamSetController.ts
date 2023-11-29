import { Request, Response } from 'express';
import { deleteTeamSetById } from '../services/teamSetService';

export const deleteTeamSet = async (req: Request, res: Response) => {
  const teamSetId = req.params.id;
  try {
    await deleteTeamSetById(teamSetId);
    return res.status(200).json({ message: 'TeamSet deleted successfully' });
  } catch (error) {
    console.error('Error deleting TeamSet:', error);
    res.status(400).json({ error: 'Failed to delete TeamSet' });
  }
};
