import { Request, Response } from 'express';
import { NotFoundError } from '../services/errors';
import { deleteTeamSetById } from '../services/teamSetService';

export const deleteTeamSet = async (req: Request, res: Response) => {
  const teamSetId = req.params.id;
  try {
    await deleteTeamSetById(teamSetId);
    return res.status(200).json({ message: 'TeamSet deleted successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).send({ error: error.message });
    } else {
      console.error('Error deleting TeamSet:', error);
      res.status(500).json({ error: 'Failed to delete TeamSet' });
    }
  }
};
