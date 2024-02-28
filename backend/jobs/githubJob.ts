import CourseModel, { Course } from '@models/Course';
import { Review, TeamContribution, TeamPR } from '@shared/types/TeamData';
import { Document, Types } from 'mongoose';
import cron from 'node-cron';
import { App, Octokit } from 'octokit';
import TeamData from '../models/TeamData';
import { filterTeamContributions, getApp, getGitHubApp } from '../utils/github';
import { graphql } from '@octokit/graphql/dist-types/types';

const fetchAndSaveTeamData = async () => {
  const app: App = getGitHubApp();
  const octokit = app.octokit;

  const response = await octokit.rest.apps.listInstallations();
  const installationIds = response.data.map(installation => installation.id);

  const courses = await CourseModel.find({
    installationId: { $in: installationIds },
  });

  await Promise.all(
    courses.map(async course => {
      if (course && course.installationId) {
        const installationOctokit = await app.getInstallationOctokit(
          course.installationId
        );
        const graphlqlApp: graphql = getApp(course.installationId);
        await getCourseData(installationOctokit, graphlqlApp, course);
      }
    })
  );

  console.log('fetchAndSaveTeamData job done');
};

const getCourseData = async (
  octokit: Octokit,
  graphqlWithAuth: graphql,
  course: Document<unknown, {}, Course> &
    Course &
    Required<{ _id: Types.ObjectId }>
) => {
  if (!course.gitHubOrgName) return;
  const gitHubOrgName = course.gitHubOrgName;

  // TODO: Add pagination
  const repos = await octokit.rest.repos.listForOrg({
    org: course.gitHubOrgName,
    sort: 'updated',
    per_page: 300,
    direction: 'desc',
  });
  let allRepos = repos.data;

  if (course.repoNameFilter) {
    allRepos = allRepos.filter(repo =>
      repo.name.includes(course.repoNameFilter as string)
    );
  }

  const data: any = await graphqlWithAuth(
    `query {
      organization(login: "${gitHubOrgName}") {
        projectsV2(first: 5) {
          nodes {
            title
            id
            repositories(first: 1) {
              edges {
                node {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }`,
  );
  console.log(data);

  const issues: any = await graphqlWithAuth(
    `query {
      node(id: "${data?.organization?.projectsV2?.nodes?.[0]?.id}") {
        ... on ProjectV2 {
          items(last: 20) {
            nodes {
              id
              content {
                ... on Issue {
                  title
                  url
                  state
                  stateReason
                }
              }
            }
          }
        }
      }
    }`
  );
  console.log(issues);

  for (const repo of allRepos) {
    const teamContributions: Record<string, TeamContribution> = {};

    const [commits, issues, prs, contributors] = await Promise.all([
      octokit.rest.repos.listCommits({
        owner: gitHubOrgName,
        repo: repo.name,
      }),
      octokit.rest.issues.listForRepo({
        owner: gitHubOrgName,
        repo: repo.name,
      }),
      octokit.rest.pulls.list({
        owner: gitHubOrgName,
        repo: repo.name,
        state: 'all',
      }),
      octokit.rest.repos.listContributors({
        owner: gitHubOrgName,
        repo: repo.name,
      }),
    ]);

    let codeFrequencyStats: number[][] = [];
    try {
      codeFrequencyStats = await fetchCodeFrequencyStats(
        octokit,
        gitHubOrgName,
        repo.name
      );
    } catch (err) {
      console.error('Error fetching code frequency stats:', err);
    }

    const teamPRs: TeamPR[] = await Promise.all(
      prs.data.map(async pr => {
        const reviews = await octokit.rest.pulls.listReviews({
          owner: gitHubOrgName,
          repo: repo.name,
          pull_number: pr.number,
        });

        const reviewDetails: Review[] = await Promise.all(
          reviews.data.map(async review => ({
            id: review.id,
            user: review.user?.login,
            body: review.body,
            state: review.state,
            comments: (
              await octokit.rest.pulls.listReviewComments({
                owner: gitHubOrgName,
                repo: repo.name,
                pull_number: pr.number,
                review_id: review.id,
              })
            ).data.map(comment => ({
              id: comment.id,
              body: comment.body,
              user: comment.user.login,
              createdAt: new Date(comment.created_at),
            })),
          }))
        );

        return {
          id: pr.id,
          title: pr.title,
          user: pr.user?.login || '',
          url: pr.html_url,
          state: pr.state,
          createdAt: new Date(pr.created_at),
          updatedAt: new Date(pr.updated_at),
          reviews: reviewDetails.map(review => ({
            id: review.id,
            body: review.body,
            state: review.state,
            submittedAt: review.submittedAt,
            user: review.user,
            comments: review.comments.map(comment => ({
              id: comment.id,
              body: comment.body,
              user: comment.user,
              createdAt: new Date(comment.createdAt),
            })),
          })),
        };
      })
    );

    for (const contributor of contributors.data) {
      if (!contributor.login) continue;

      const contributorCommits = commits.data.filter(
        commit => commit.author?.login === contributor.login
      ).length;

      const createdIssues = issues.data.filter(
        issue => issue.user && issue.user.login === contributor.login
      ).length;
      const openIssues = issues.data.filter(
        issue =>
          issue.user &&
          issue.user.login === contributor.login &&
          issue.state === 'open'
      ).length;
      const closedIssues = issues.data.filter(
        issue =>
          issue.user &&
          issue.user.login === contributor.login &&
          issue.state === 'closed'
      ).length;

      const contributorPRs = prs.data.filter(
        pr => pr.user && pr.user.login === contributor.login
      ).length;

      teamContributions[contributor.login] = {
        commits: contributorCommits,
        createdIssues: createdIssues,
        openIssues: openIssues,
        closedIssues: closedIssues,
        pullRequests: contributorPRs,
        codeReviews: 0,
        comments: 0,
      };
    }

    for (const teamPR of teamPRs) {
      for (const review of teamPR.reviews) {
        if (!review.user || !(review.user in teamContributions)) continue;
        teamContributions[review.user].codeReviews++;
        teamContributions[review.user].comments += review.comments.length;
      }
    }
    filterTeamContributions(teamContributions);

    const teamData = {
      gitHubOrgName: gitHubOrgName.toLowerCase(),
      teamId: repo.id,
      repoName: repo.name,
      commits: commits.data.length,
      weeklyCommits: codeFrequencyStats,
      issues: issues.data.length,
      pullRequests: prs.data.length,
      updatedIssues: issues.data.map(issue => issue.updated_at),
      teamContributions,
      teamPRs,
    };

    console.log('Saving team data:', teamData);

    await TeamData.findOneAndUpdate({ teamId: teamData.teamId }, teamData, {
      upsert: true,
    });
  }
};

const fetchCodeFrequencyStats = async (
  octokit: Octokit,
  owner: string,
  repo: string
) => {
  let attempt = 0;
  const maxAttempts = 10; // Maximum number of attempts
  const delayBetweenAttempts = 2000; // Delay in milliseconds

  while (attempt < maxAttempts) {
    try {
      const response = await octokit.rest.repos.getCodeFrequencyStats({
        owner,
        repo,
      });

      if (response.status === 200) {
        // Data is ready
        return response.data;
      } else if (response.status === 202) {
        // Data is not ready yet, wait and try again
        await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
        attempt++;
      } else {
        // Handle other HTTP statuses
        throw new Error('Failed to fetch code frequency stats');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(
          `Error fetching code frequency stats: ${error.message}`
        );
      }
    }
  }

  throw new Error('Max attempts reached. Data may not be available yet.');
};

export const setupGitHubJob = () => {
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

export default setupGitHubJob;
