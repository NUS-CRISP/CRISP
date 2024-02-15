import { Request, Response } from 'express';
import { NotFoundError } from '../services/errors';
import {
  checkGitHubInstallation,
  fetchAllTeamData,
  fetchAllTeamDataForOrg,
  getAuthorizedTeamDataByCourse,
} from '../services/githubService';
import { getAccountId } from '../utils/auth';

export const getAllTeamData = async (req: Request, res: Response) => {
  try {
    const teamData = await fetchAllTeamData();
    return res.status(200).json({ teamData });
  } catch (error) {
    console.error('Error retrieving all teams data:', error);
    return res.status(500).json({ error: 'Failed to get all teams data' });
  }
};

export const getAllTeamDataByOrg = async (req: Request, res: Response) => {
  try {
    const teamDatas = await fetchAllTeamDataForOrg(req.params.gitHubOrgName);
    return res.status(200).json(teamDatas);
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

export const getAllTeamDataByCourse = async (req: Request, res: Response) => {
  const courseId = req.params.id;

  const accountId = await getAccountId(req);
  if (!accountId) {
    res.status(400).json({ error: 'Missing authorization' });
    return;
  }

  try {
    const teams = await getAuthorizedTeamDataByCourse(accountId, courseId);
    res.status(200).json(teams);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error fetching teams:', error);
      res.status(500).json({ error: 'Failed to fetch teams' });
    }
  }
};

// TODO: Refactor this to separate gitHubController file; rest should be in teamDataController
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
