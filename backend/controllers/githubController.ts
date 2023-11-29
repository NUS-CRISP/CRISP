import { Request, Response } from 'express';
import { RequestError } from 'octokit';
import TeamData from '../models/TeamData';
import { getGitHubApp } from '../utils/github';

export const getAllTeamData = async (req: Request, res: Response) => {
  try {
    const teamData = await TeamData.find({});
    return res.status(200).json({ teamData });
  } catch (error) {
    return res.status(400).json({ error: 'Failed to get all teams data' });
  }
};

export const getAllTeamDataForOrg = async (req: Request, res: Response) => {
  try {
    const teamDatas = await TeamData.find({
      gitHubOrgName: req.params.gitHubOrgName.toLowerCase(),
    });
    if (!teamDatas) {
      return res.status(404).json({ error: 'Team datas not found' });
    }
    return res.status(200).json({ teamDatas });
  } catch (error) {
    return res.status(400).json({ error: 'Failed to get team datas for org' });
  }
};

export const checkInstallation = async (req: Request, res: Response) => {
  // get request body; json with one field containing org name
  const { orgName } = req.body;

  // get github app
  const octokit = getGitHubApp().octokit;

  try {
    // This will throw an error if the app is not installed on the organization
    const response = await octokit.rest.apps.getOrgInstallation({
      org: orgName,
    });
    const installationId = response.data.id;
    res.status(200).json({ installationId });
  } catch (error) {
    if (error instanceof RequestError && error.status === 404) {
      res.status(404).json({
        message:
          'The GitHub App is not installed on the specified organization.',
      });
    } else {
      res.status(500).json({
        message: 'An error occurred while checking the installation status.',
      });
    }
    return false;
  }
};
