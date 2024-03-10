import TeamModel from '@models/Team';
import TeamDataModel from '@models/TeamData';
import UserModel from '@models/User';
import { App } from 'octokit';

export const getGitHubApp = (): App => {
  const APP_ID = Number(process.env.GITHUB_APP_ID!);
  const PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, '\n');

  return new App({
    appId: APP_ID,
    privateKey: PRIVATE_KEY,
  });
};

export const getTeamMembers = async (teamId: number) => {
  const teamData = await TeamDataModel.findOne({ teamId });
  if (!teamData) return null;

  const team = await TeamModel.findOne({ teamData: teamData._id });
  if (!team) return null;

  const teamMembers = await UserModel.find({ _id: { $in: team.members } });
  const teamMembersGitHandles = teamMembers.map(member => member.gitHandle);

  return new Set(teamMembersGitHandles);
};
