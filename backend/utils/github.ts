import { TeamContribution } from '@shared/types/TeamData';
import { App } from 'octokit';

export const getGitHubApp = (): App => {
  const APP_ID = Number(process.env.GITHUB_APP_ID!);
  const PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, '\n');

  return new App({
    appId: APP_ID,
    privateKey: PRIVATE_KEY,
  });
};

/**
 * Deletes keys from a record
 */
const filterRecord = <T>(record: Record<string, T>, ...keys: string[]) => {
  for (const key of keys) {
    if (key in record) delete record[key];
  }
};

const FILTER_LIST = ['github-classroom[bot]'];

export const filterTeamContributions = (
  teamContributions: Record<string, TeamContribution>
) => filterRecord(teamContributions, ...FILTER_LIST);
