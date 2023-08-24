import { NextApiRequest, NextApiResponse } from 'next';
import { App } from 'octokit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const githubApp = new App({
  appId: process.env.GITHUB_APP_ID!,
  privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
  });

  const installations = await githubApp.octokit.request('GET /users/{username}/installation', {
        username: 'NUS-CRISP',
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

  const INSTALLATION_ID = installations.data.id;

  const octokit = await githubApp.getInstallationOctokit(INSTALLATION_ID);

  const octokitResponse = await octokit.request('GET /repos/{owner}/{repo}/stats/code_frequency', {
    owner: 'NUS-CRISP',
    repo: 'CRISP',
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  if (octokitResponse.status === 200) {
    res.status(200).json(octokitResponse.data);
  } else {
    res.status(500).json({ error: 'Unable to fetch data from GitHub' });
  }
}