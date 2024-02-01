import { Request, Response } from 'express';
import { NotFoundError } from '../services/errors';
import { fetchTeamDatasByOrg } from '../services/teamDataService';

export const getReposByOrg = async (req: Request, res: Response) => {
  const { org } = req.params;
  try {
    const teamDatas = await fetchTeamDatasByOrg(org);
    res.status(200).json(teamDatas);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ message: error.message });
    } else {
      console.error('Error retrieving team datas for org:', error);
      res.status(500).json({ error: 'Failed to get team datas for org' });
    }
  }
};
