import {
  TeamData as ITeamData,
  TeamContribution,
} from '@shared/types/TeamData';
import cron from 'node-cron';
import { App } from 'octokit';
import TeamData from '../models/TeamData';

const fetchAndSaveTeamData = async (env: Record<string, string>) => {
  const APP_ID = Number(env.GITHUB_APP_ID);
  const PRIVATE_KEY = env.GITHUB_APP_PRIVATE_KEY.replace(/\n/g, '\n');

  const app = new App({
    appId: APP_ID,
    privateKey: PRIVATE_KEY,
  });
  const octokit = app.octokit;

  const response = await octokit.rest.apps.listInstallations();
  const installations = response.data;
  installations.map(installation => {
    if (installation.account && 'login' in installation.account) {
      getOrgData(app, {
        id: installation.id,
        account: { login: installation.account.login },
      });
    }
  });
};

interface Installation {
  id: number;
  account: {
    login: string;
  };
}

const getOrgData = async (app: App, installation: Installation) => {
  const octokit = await app.getInstallationOctokit(installation.id);
  const orgName = installation.account.login;

  const repos = await octokit.rest.repos.listForOrg({
    org: orgName,
  });

  for (const repo of repos.data) {
    const contributors = await octokit.rest.repos.listContributors({
      owner: orgName,
      repo: repo.name,
    });

    const teamContributions: Record<string, TeamContribution> = {};

    for (const contributor of contributors.data) {
      const commitsByContributor = await octokit.rest.repos.listCommits({
        owner: orgName,
        repo: repo.name,
        author: contributor.login,
      });

      const prsByContributor = await octokit.rest.pulls.list({
        owner: orgName,
        repo: repo.name,
        creator: contributor.login,
      });

      let reviewsByContributor = 0;

      const prs = await octokit.rest.pulls.list({
        owner: orgName,
        repo: repo.name,
      });

      for (const pr of prs.data) {
        const reviews = await octokit.rest.pulls.listReviews({
          owner: orgName,
          repo: repo.name,
          pull_number: pr.number,
        });

        reviewsByContributor += reviews.data.filter(
          review => review.user && review.user.login === contributor.login
        ).length;
      }

      const issuesCreatedByContributor = await octokit.rest.issues.listForRepo({
        owner: orgName,
        repo: repo.name,
        creator: contributor.login,
      });

      const openIssuesByContributor = issuesCreatedByContributor.data.filter(
        issue => issue.state === 'open'
      ).length;
      const closedIssuesByContributor = issuesCreatedByContributor.data.filter(
        issue => issue.state === 'closed'
      ).length;

      let additions = 0;
      let deletions = 0;

      for (const commit of commitsByContributor.data) {
        const commitDetail = await octokit.rest.repos.getCommit({
          owner: orgName,
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
          pullRequests: prsByContributor.data.length,
          reviews: reviewsByContributor,
          createdIssues: issuesCreatedByContributor.data.length,
          openIssues: openIssuesByContributor,
          closedIssues: closedIssuesByContributor,
        };
      }
    }

    const commits = await octokit.rest.repos.listCommits({
      owner: orgName,
      repo: repo.name,
    });

    const issues = await octokit.rest.issues.listForRepo({
      owner: orgName,
      repo: repo.name,
    });

    const pullRequests = await octokit.rest.pulls.list({
      owner: orgName,
      repo: repo.name,
      state: 'open',
    });

    const teamData: Omit<ITeamData, '_id'> = {
      teamId: repo.id,
      repoName: repo.name,
      commits: commits.data.length,
      issues: issues.data.length,
      stars: repo.stargazers_count ?? 0,
      forks: repo.forks_count ?? 0,
      pullRequests: pullRequests.data.length,
      updatedIssues: issues.data.map(issue => issue.updated_at),
      teamContributions,
    };

    console.log('Saving team data:', teamData);

    await TeamData.findOneAndUpdate({ teamId: teamData.teamId }, teamData, {
      upsert: true,
    });
  }
};

export const setupJob = () => {
  const env = validateEnv();

  // Schedule the job to run every day at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Running fetchAndSaveTeamData job:', new Date().toString());
    try {
      await fetchAndSaveTeamData(env);
    } catch (err) {
      console.error('Error in cron job fetchAndSaveTeamData:', err);
    }
  });

  // To run the job immediately for testing
  if (process.env.RUN_JOB_NOW === 'true') {
    fetchAndSaveTeamData(env).catch(err => {
      console.error('Error running job manually:', err);
    });
  }
};

const ENV_KEYS = [
  'GITHUB_APP_ID',
  'GITHUB_APP_PRIVATE_KEY',
  'GITHUB_APP_INSTALLATION_ID',
  'RUN_JOB_NOW',
];

const validateEnv = () => {
  const env: Record<string, string> = {};
  for (const key of ENV_KEYS) {
    if (process.env[key] === undefined) {
      throw new Error(`${key} is not defined`);
    } else {
      env[key] = process.env[key]!;
    }
  }
  return env;
};
