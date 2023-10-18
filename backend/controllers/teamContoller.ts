import { Request, Response } from 'express';
import TeamModel from '../models/Team'
import TeamSetModel from '../models/TeamSet'

export const deleteTeam = async (req: Request, res: Response) => {
    const teamId = req.params.id;
  
    try {
      const team = await TeamModel.findById(teamId);
  
      if (!team) {
        return res.status(404).json({ message: 'Team not found' });
      }
  
      const teamSet = await TeamSetModel.findById(team.teamSet);
      if (teamSet) {
        const index = teamSet.teams.indexOf(team._id);
        if (index !== -1) {
          teamSet.teams.splice(index, 1);
        }
        await teamSet.save();
      }
  
      await TeamModel.findByIdAndDelete(teamId);
  
      return res.status(200).json({ message: 'Team deleted successfully' });
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete the team' });
    }
  };