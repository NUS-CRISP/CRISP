import { App } from 'octokit';

export const githubApp = new App({
  appId: process.env.GITHUB_APP_ID!,
  privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
});