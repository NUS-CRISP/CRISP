import CourseModel from '@models/Course';
import { Review, TeamContribution, TeamPR } from '@shared/types/TeamData';
import cron from 'node-cron';
import { App, Octokit } from 'octokit';
import TeamData from '../models/TeamData';
import { getGitHubApp } from 'utils/github';

const fetchPublicRepoData = async () => {
  const courses = await CourseModel.find();

  await Promise.all(
    courses.map(async course => {
      if (course && course.gitHubRepoLinks.length > 0) {
        try {
          // Call getPublicCourseData to process the course and repo data
          await getPublicCourseData(course);
        } catch (error) {
          console.error(
            `Error fetching repository data for ${course.name}:`,
            error
          );
        }
      }
    })
  );

  console.log('fetchPublicRepoData job done');
};

const getPublicCourseData = async (course: any) => {
  if (!course.gitHubRepoLinks || course.gitHubRepoLinks.length === 0) return;

  const app: App = getGitHubApp();
  const genericOctokit = app.octokit; // Use a generic octokit instance

  for (const repoUrl of course.gitHubRepoLinks) {
    const urlParts = repoUrl.split('/');
    const owner = urlParts[3]; // Get the 'owner' part of the URL
    const repo = urlParts[4]; // Get the 'repo' part of the URL

    const installationId = await checkAppInstalled(owner);

    const octokit = installationId
      ? await app.getInstallationOctokit(installationId)
      : genericOctokit;

    try {
      // Fetch repository data using public Octokit instance
      const repoData = await octokit.rest.repos.get({
        owner,
        repo,
      });

      const teamContributions: Record<string, TeamContribution> = {};

      const [commits, issues, prs, contributors, milestones] =
        await Promise.all([
          fetchAllPagesWithBackoff(page =>
            octokit.rest.repos.listCommits({
              owner,
              repo,
              since: getFourMonthsAgo(),
              per_page: 100,
              page,
            })
          ),
          fetchAllPagesWithBackoff(page =>
            octokit.rest.issues.listForRepo({
              owner,
              repo,
              since: getFourMonthsAgo(),
              per_page: 100,
              page,
            })
          ),
          fetchAllPagesWithBackoff(page =>
            octokit.rest.pulls.list({
              owner,
              repo,
              since: getFourMonthsAgo(),
              state: 'all',
              per_page: 100,
              page,
            })
          ),
          fetchAllPagesWithBackoff(page =>
            octokit.rest.repos.listContributors({
              owner,
              repo,
              per_page: 100,
              page,
            })
          ),
          fetchAllPagesWithBackoff(page =>
            octokit.rest.issues.listMilestones({
              owner,
              repo,
              state: 'all',
              per_page: 100,
              page,
            })
          ),
        ]);

      let codeFrequencyStats: number[][] = [];
      try {
        codeFrequencyStats = await fetchCodeFrequencyStats(
          octokit,
          owner,
          repo
        );
      } catch (err) {
        console.error('Error fetching code frequency stats:', err);
      }

      const teamPRs: TeamPR[] = await Promise.all(
        prs.map(async pr => {
          const reviews = await fetchAllPagesWithBackoff(page =>
            octokit.rest.pulls.listReviews({
              owner,
              repo,
              pull_number: pr.number,
              per_page: 100,
              page,
            })
          );

          const reviewDetails: Review[] = await Promise.all(
            reviews.map(async review => ({
              id: review.id,
              user: review.user?.login,
              body: review.body,
              state: review.state,
              submittedAt: review.submitted_at,
              comments: (
                await fetchAllPagesWithBackoff(page =>
                  octokit.rest.pulls.listReviewComments({
                    owner,
                    repo,
                    pull_number: pr.number,
                    review_id: review.id,
                    per_page: 100,
                    page,
                  })
                )
              ).map(comment => ({
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

      // Process team contributions (same as the original code)
      for (const contributor of contributors) {
        if (!contributor.login) continue;

        const contributorCommits = commits.filter(
          commit => commit.author?.login === contributor.login
        ).length;

        const createdIssues = issues.filter(
          issue => issue.user && issue.user.login === contributor.login
        ).length;
        const openIssues = issues.filter(
          issue =>
            issue.user &&
            issue.user.login === contributor.login &&
            issue.state === 'open'
        ).length;
        const closedIssues = issues.filter(
          issue =>
            issue.user &&
            issue.user.login === contributor.login &&
            issue.state === 'closed'
        ).length;

        const contributorPRs = prs.filter(
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

      // Continue with team PR reviews and save data
      for (const teamPR of teamPRs) {
        for (const review of teamPR.reviews) {
          if (!review.user || !(review.user in teamContributions)) continue;
          teamContributions[review.user].codeReviews++;
          teamContributions[review.user].comments += review.comments.length;
        }
      }

      const teamData = {
        gitHubOrgName: owner.toLowerCase(),
        teamId: repoData.data.id,
        repoName: repo,
        commits: commits.length,
        weeklyCommits: codeFrequencyStats,
        issues: issues.length,
        pullRequests: prs.length,
        updatedIssues: issues.map(issue => issue.updated_at),
        teamContributions,
        teamPRs,
        milestones: milestones,
      };

      console.log('Saving team data:', teamData);

      await TeamData.findOneAndUpdate({ teamId: teamData.teamId }, teamData, {
        upsert: true,
      });
    } catch (error) {
      console.error(`Error fetching repository data for ${repoUrl}:`, error);
    }
  }
};

const checkAppInstalled = async (username: string) => {
  try {
    const app = getGitHubApp(); // Get the GitHub App instance
    const octokit = app.octokit; // Create an Octokit instance authenticated as the App

    const response = await octokit.rest.apps.getUserInstallation({
      username,
    });

    if (response.status === 200) {
      const installationId = response.data.id;
      console.log(
        `App is installed for user ${username}, Installation ID: ${installationId}`
      );
      return installationId;
    }
  } catch (error: any) {
    if (error.status === 404) {
      console.log(`App is not installed for user ${username}`);
    } else {
      console.error(`Error checking app installation: ${error.message}`);
    }
  }
};

const fetchCodeFrequencyStats = async (
  octokit: Octokit,
  owner: string,
  repo: string
) => {
  let attempt = 0;
  const maxAttempts = 10;
  const delayBetweenAttempts = 2000;

  while (attempt < maxAttempts) {
    try {
      const response = await octokit.rest.repos.getCodeFrequencyStats({
        owner,
        repo,
      });

      if (response.status === 200) {
        return response.data;
      } else if (response.status === 202) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
        attempt++;
      } else {
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

const fetchWithExponentialBackoff = async (
  request: () => Promise<any>,
  retries = 5,
  delay = 1000
): Promise<any> => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await request();
      return response;
    } catch (err: any) {
      if (
        err.status === 403 &&
        err.response?.headers['x-ratelimit-remaining'] === '0'
      ) {
        // Rate limit hit, perform backoff
        const resetTime =
          parseInt(err.response.headers['x-ratelimit-reset']) * 1000;
        const waitTime = resetTime - Date.now();
        console.warn(`Rate limit exceeded, waiting for ${waitTime} ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else if (
        err.status === 403 &&
        err.message.includes('SecondaryRateLimit')
      ) {
        // Handle secondary rate limit with exponential backoff
        const backoffTime = delay * Math.pow(2, i); // Exponential backoff
        console.warn(
          `SecondaryRateLimit detected, retrying in ${backoffTime} ms...`
        );
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      } else {
        throw err;
      }
    }
  }
  throw new Error('Max retries reached. Unable to complete the request.');
};

const fetchAllPagesWithBackoff = async (
  request: (page: number) => Promise<any>,
  retries = 5,
  delay = 1000,
  perPage = 100
): Promise<any[]> => {
  let page = 1;
  let allData: any[] = [];
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await fetchWithExponentialBackoff(
        () => request(page),
        retries,
        delay
      );
      allData = allData.concat(response.data);

      // Check if there are more pages
      if (response.data.length < perPage) {
        hasMore = false; // No more pages
      } else {
        page++;
      }
    } catch (error) {
      console.error('Error fetching paginated data:', error);
      throw error;
    }
  }

  return allData;
};

const getFourMonthsAgo = (): string => {
  const date = new Date();
  date.setMonth(date.getMonth() - 4);
  return date.toISOString(); // Format the date in ISO string (required by GitHub API)
};

export const setupPublicGitHubJob = () => {
  // Schedule the job to run every day at 05:00
  cron.schedule('0 5 * * *', async () => {
    console.log('Running fetchPublicRepoData job:', new Date().toString());
    try {
      await fetchPublicRepoData();
    } catch (err) {
      console.error('Error in cron job fetchPublicRepoData:', err);
    }
  });

  // To run the job immediately for testing
  if (process.env.RUN_JOB_NOW === 'true') {
    fetchPublicRepoData().catch(err => {
      console.error('Error running job manually:', err);
    });
  }
};

export default setupPublicGitHubJob;
