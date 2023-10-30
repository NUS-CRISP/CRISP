import { Request, Response } from 'express';
import Team from '../models/Team';
import TeamSet from '../models/TeamSet';

export const deleteTeam = async (req: Request, res: Response) => {
  const teamId = req.params.id;

  try {
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    const teamSet = await TeamSet.findById(team.teamSet);
    if (teamSet && teamSet.teams) {
      const index = teamSet.teams.indexOf(team._id);
      if (index !== -1) {
        teamSet.teams.splice(index, 1);
      }
      await teamSet.save();
    }

    await Team.findByIdAndDelete(teamId);

    return res.status(200).json({ message: 'Team deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete the team' });
  }
};

export const updateTeam = async (req: Request, res: Response) => {
  const teamId = req.params.id;
  try {
    const updatedTeam = await Team.findByIdAndUpdate(teamId, req.body, {
      new: true,
    });
    if (updatedTeam) {
      res.json(updatedTeam);
    } else {
      res.status(404).json({ error: 'Team not found' });
    }
  } catch (error) {
    res.status(400).json({ error: 'Failed to update team' });
  }
};
