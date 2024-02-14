import { App } from 'octokit';

export const getGitHubApp = (): App => {
  const APP_ID = Number(process.env.GITHUB_APP_ID!);
  const PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, '\n');

  return new App({
    appId: APP_ID,
    privateKey: PRIVATE_KEY,
  });
};
