import { Request, Response } from 'express';
import { NotFoundError } from '../services/errors';
import {
  checkGitHubInstallation,
  fetchAllTeamData,
  fetchAllTeamDataForOrg,
} from '../services/githubService';

export const getAllTeamData = async (req: Request, res: Response) => {
  try {
    const teamData = await fetchAllTeamData();
    return res.status(200).json({ teamData });
  } catch (error) {
    console.error('Error retrieving all teams data:', error);
    return res.status(500).json({ error: 'Failed to get all teams data' });
  }
};

export const getAllTeamDataForOrg = async (req: Request, res: Response) => {
  try {
    const teamDatas = await fetchAllTeamDataForOrg(req.params.gitHubOrgName);
    return res.status(200).json({ teamDatas });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ message: error.message });
    } else {
      console.error('Error retrieving team datas for org:', error);
      return res
        .status(500)
        .json({ error: 'Failed to get team datas for org' });
    }
  }
};

export const checkInstallation = async (req: Request, res: Response) => {
  const { orgName } = req.body;
  try {
    const installationId = await checkGitHubInstallation(orgName);
    res.status(200).json({ installationId });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ message: error.message });
    } else {
      console.error('Error checking github installation:', error);
      res.status(500).json({
        message: 'An error occurred while checking the installation status.',
      });
    }
  }
};
