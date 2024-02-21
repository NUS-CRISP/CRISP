import CourseModel, { Course } from '@models/Course';
import { Review, TeamContribution, TeamPR } from '@shared/types/TeamData';
import { Document, Types } from 'mongoose';
import cron from 'node-cron';
import { App, Octokit } from 'octokit';
import TeamData from '../models/TeamData';
import { getGitHubApp } from '../utils/github';

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
        await getCourseData(installationOctokit, course);
      }
    })
  );

  console.log('fetchAndSaveTeamData job done');
};

const getCourseData = async (
  octokit: Octokit,
  course: Document<unknown, {}, Course> &
    Course &
    Required<{ _id: Types.ObjectId }>
) => {
  const teamContributions: Record<string, TeamContribution> = {};
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

  for (const repo of allRepos) {
    const [commits, issues, prs, contributors] = await Promise.all([
      octokit.rest.repos.listCommits({ owner: gitHubOrgName, repo: repo.name }),
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

    const teamPRs: TeamPR[] = await Promise.all(
      prs.data.map(async pr => {
        // Get addition and deletion counts for each PR
        const prData = await octokit.rest.pulls.get({
          owner: gitHubOrgName,
          repo: repo.name,
          pull_number: pr.number,
        });

        const additions = prData.data.additions;
        const deletions = prData.data.deletions;

        if (pr.user && pr.user.login) {
          if (pr.user.login in teamContributions) {
            teamContributions[pr.user.login].additions += additions;
            teamContributions[pr.user.login].deletions += deletions;
          } else {
            teamContributions[pr.user.login] = {
              commits: 0,
              additions: additions,
              deletions: deletions,
              createdIssues: 0,
              openIssues: 0,
              closedIssues: 0,
              pullRequests: 0,
              codeReviews: 0,
              comments: 0,
            };
          }
        }

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

      let codeReviews = 0;
      let comments = 0;
      teamPRs.forEach(pr => {
        pr.reviews.forEach(review => {
          if (review.user === contributor.login) {
            codeReviews++;
            comments += review.comments.length;
          }
        });
      });

      teamContributions[contributor.login] = {
        commits: contributorCommits,
        additions: teamContributions[contributor.login]
          ? teamContributions[contributor.login].additions
          : 0,
        deletions: teamContributions[contributor.login]
          ? teamContributions[contributor.login].deletions
          : 0,
        createdIssues: createdIssues,
        openIssues: openIssues,
        closedIssues: closedIssues,
        pullRequests: contributorPRs,
        codeReviews: codeReviews,
        comments: comments,
      };
    }

    const teamData = {
      gitHubOrgName: gitHubOrgName.toLowerCase(),
      teamId: repo.id,
      repoName: repo.name,
      commits: commits.data.length,
      issues: issues.data.length,
      stars: repo.stargazers_count ?? 0,
      forks: repo.forks_count ?? 0,
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
