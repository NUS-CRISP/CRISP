import TeamDataModel from '../models/TeamData';

export const fetchTeamDatasByOrg = async (gitHubOrgName: string) =>
  await TeamDataModel.find({ gitHubOrgName });
