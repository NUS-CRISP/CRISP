import { Request, Response } from 'express';
import TeamData from '../models/TeamData';

export const getAllTeamData = async (req: Request, res: Response) => {
  try {
    const teamData = await TeamData.find({});
    console.log(teamData);
    return res.status(200).json({ teamData });
  }
  catch (error) {
    return res.status(400).json({ error: 'Failed to get team data' });
  }
}