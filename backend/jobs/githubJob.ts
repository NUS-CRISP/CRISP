import cron from 'node-cron';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from 'octokit';
import { TeamContribution, TeamData } from '../models/TeamData';

const ORG_NAME = 'NUS-CRISP';

const fetchAndSaveTeamData = async () => {
  const auth = createAppAuth({
    appId: process.env.GITHUB_APP_ID!,
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    installationId: process.env.GITHUB_APP_INSTALLATION_ID!,
  });

  const { token } = await auth({ type: 'installation' });

  const octokit = new Octokit({ auth: token });

  // Fetch all repositories for an organization
  const repos = await octokit.rest.repos.listForOrg({
    org: ORG_NAME,
  });

  await TeamData.deleteMany({}); // temp w/a to avoid duplicates

  for (const repo of repos.data) {
    const contributors = await octokit.rest.repos.listContributors({
      owner: ORG_NAME,
      repo: repo.name,
    });

    const teamContributions: Record<string, TeamContribution> = {};

    for (const contributor of contributors.data) {
      const commitsByContributor = await octokit.rest.repos.listCommits({
        owner: ORG_NAME,
        repo: repo.name,
        author: contributor.login,
      });

      let additions = 0;
      let deletions = 0;

      // Fetch detailed commit data to get additions/deletions
      for (const commit of commitsByContributor.data) {
        const commitDetail = await octokit.rest.repos.getCommit({
          owner: ORG_NAME,
          repo: repo.name,
          ref: commit.sha,
        });

        if (commitDetail.data.stats) {
          additions += commitDetail.data.stats.additions || 0;
          deletions += commitDetail.data.stats.deletions || 0;
        }
      }

      if (contributor.login) {
        teamContributions[contributor.login] = {
          commits: commitsByContributor.data.length,
          additions,
          deletions,
        };
      }
    }

    // Fetch commits
    const commits = await octokit.rest.repos.listCommits({
      owner: ORG_NAME,
      repo: repo.name,
    });

    // Fetch issues
    const issues = await octokit.rest.issues.listForRepo({
      owner: ORG_NAME,
      repo: repo.name,
    });

    // Fetch pull requests
    const pullRequests = await octokit.rest.pulls.list({
      owner: ORG_NAME,
      repo: repo.name,
      state: 'open',
    });

    // Extract more information
    const stars = repo.stargazers_count;
    const forks = repo.forks_count;

    // Process and save to MongoDB
    const teamData = new TeamData({
      teamId: repo.id,
      repoName: repo.name,
      commits: commits.data.length,
      issues: issues.data.length,
      stars,
      forks,
      pullRequests: pullRequests.data.length,
      updatedIssues: issues.data.map(issue => issue.updated_at),
      teamContributions,
    });

    await teamData.save();
  }
};

export const setupJob = () => {
  // Schedule the job to run every day at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Running fetchAndSaveTeamData job:', new Date().toString());
    try {
      await fetchAndSaveTeamData();
    } catch (err) {
      console.error('Error in cron job fetchAndSaveTeamData:', err);
    }
  });

  // To run the job immediately for testing
  if (process.env.RUN_JOB_NOW === 'true') {
    fetchAndSaveTeamData().catch(err => {
      console.error('Error running job manually:', err);
    });
  }
};
