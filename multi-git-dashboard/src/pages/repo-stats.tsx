import RepoCard from '@/components/RepoCard';
import React from 'react';
import { githubApp } from './api/github';

const RepoStatsPage: React.FC = async () => {
  const installations = await githubApp.octokit.request('GET /users/{username}/installation', {
    username: 'NUS-CRISP',
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  const INSTALLATION_ID = installations.data.id;

  const octokit = await githubApp.getInstallationOctokit(INSTALLATION_ID);

  const res = await octokit.request('GET /repos/{owner}/{repo}/stats/code_frequency', {
    owner: 'NUS-CRISP',
    repo: 'CRISP',
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  const weeks = res.status === 200 ? res.data : [];

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="flex flex-col items-center justify-center">
        <RepoCard weeks={weeks} />
      </div>
    </main>
  );
}

export default RepoStatsPage;