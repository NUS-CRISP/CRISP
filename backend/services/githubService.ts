import { RequestError } from 'octokit';
import { getGitHubApp } from '../utils/github';
import TeamDataModel from '../models/TeamData';
import { NotFoundError } from './errors';

export const fetchAllTeamData = async () => {
  return await TeamDataModel.find({});
};

export const fetchAllTeamDataForOrg = async (gitHubOrgName: string) => {
  const teamDatas = await TeamDataModel.find({
    gitHubOrgName: gitHubOrgName.toLowerCase(),
  });
  if (!teamDatas) {
    throw new NotFoundError('Team datas not found');
  }
  return teamDatas;
};

export const checkGitHubInstallation = async (orgName: string) => {
  const octokit = getGitHubApp().octokit;
  try {
    const response = await octokit.rest.apps.getOrgInstallation({
      org: orgName,
    });
    return response.data.id;
  } catch (error) {
    if (error instanceof RequestError && error.status === 404) {
      throw new NotFoundError(
        'The GitHub App is not installed on the specified organization.'
      );
    } else if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      console.error('Unknown Eerror checking github installation:', error);
      throw new Error('Unknown error checking GitHub installation.');
    }
  }
};
