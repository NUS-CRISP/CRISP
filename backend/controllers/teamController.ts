import { Request, Response } from 'express';
import { NotFoundError } from '../services/errors';
import {
  deleteTeamById,
  getTeamsByCourseId,
  removeMembersById,
  updateTeamById,
} from '../services/teamService';

export const getTeamsByCourse = async (req: Request, res: Response) => {
  const { courseId } = req.params;
  try {
    const teams = await getTeamsByCourseId(courseId);
    res.status(200).json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
};

export const deleteTeam = async (req: Request, res: Response) => {
  const teamId = req.params.id;
  try {
    await deleteTeamById(teamId);
    return res.status(200).json({ message: 'Team deleted successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error deleting team:', error);
      res.status(500).json({ error: 'Failed to delete team' });
    }
  }
};

export const updateTeam = async (req: Request, res: Response) => {
  const teamId = req.params.id;
  try {
    await updateTeamById(teamId, req.body);
    res.status(200).json({ message: 'Team updated successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error updating team:', error);
      res.status(500).json({ error: 'Failed to update team' });
    }
  }
};

export const removeMembersFromTeam = async (req: Request, res: Response) => {
  const { id, userId } = req.params;
  try {
    await removeMembersById(id, userId);
    res.status(200).json({ message: 'Members removed successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error removing member:', error);
      res.status(500).json({ error: 'Failed to remove member' });
    }
  }
};
