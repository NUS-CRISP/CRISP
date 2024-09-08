import CourseModel from '@models/Course';
import {
  JiraBoardModel,
  JiraIssueModel,
  JiraSprintModel,
} from '@models/JiraData';
import { JiraBoard, JiraIssue } from '@shared/types/JiraData';
import { Review, TeamContribution, TeamPR } from '@shared/types/TeamData';
import cron from 'node-cron';
import { App, Octokit } from 'octokit';
import TeamData from '../models/TeamData';
import { getGitHubApp, getTeamMembers } from '../utils/github';

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

const getCourseData = async (octokit: Octokit, course: any) => {
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

  await fetchGitHubProjectData(octokit, course, gitHubOrgName);

  if (course.repoNameFilter) {
    allRepos = allRepos.filter(repo =>
      repo.name.includes(course.repoNameFilter as string)
    );
  }

  for (const repo of allRepos) {
    const teamContributions: Record<string, TeamContribution> = {};

    const [commits, issues, prs, contributors, milestones] = await Promise.all([
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
      octokit.rest.issues.listMilestones({
        owner: gitHubOrgName,
        repo: repo.name,
        state: 'all',
      }),
    ]);

    // Filter out non team members
    // TODO: Enable only after gitHandle mapping is done
    if (process.env.NEW_FILTER === 'true') {
      const teamMembers = await getTeamMembers(repo.id);
      if (teamMembers) {
        commits.data = commits.data.filter(
          commit => commit.author && teamMembers.has(commit.author.login)
        );
        issues.data = issues.data.filter(
          issue => issue.user && teamMembers.has(issue.user.login)
        );
        prs.data = prs.data.filter(
          pr => pr.user && teamMembers.has(pr.user.login)
        );
        contributors.data = contributors.data.filter(
          contributor => contributor.login && teamMembers.has(contributor.login)
        );
      }
    }

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
            submittedAt: review.submitted_at,
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

    if (!process.env.NEW_FILTER) {
      if ('github-classroom[bot]' in teamContributions) {
        delete teamContributions['github-classroom[bot]'];
      }
    }

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
      milestones: milestones.data,
    };

    console.log('Saving team data:', teamData);

    await TeamData.findOneAndUpdate({ teamId: teamData.teamId }, teamData, {
      upsert: true,
    });
  }
};

const fetchGitHubProjectData = async (
  octokit: Octokit,
  course: any,
  gitHubOrgName: string
) => {
  // GraphQL Pagination
  let hasNextProject = true;
  let projectEndCursor = '';
  let gitHubProjectCount = 0;

  while (hasNextProject && gitHubProjectCount < 25) {
    let hasNextIssue = true;
    let issueEndCursor = '';
    gitHubProjectCount++;

    while (hasNextIssue) {
      const data: any = await octokit.graphql(
        `query {
          organization(login: "${gitHubOrgName}") {
            projectsV2(first: 1, orderBy: {field: UPDATED_AT, direction: DESC}, after: "${projectEndCursor}") {
              pageInfo {
                endCursor
                hasNextPage
                hasPreviousPage
              }
              nodes {
                id
                title
                fields(first: 20) {
                  nodes {
                    ... on ProjectV2Field {
                      name
                    }
                    ... on ProjectV2SingleSelectField {
                      name
                      options {
                        id
                        name
                      }
                    }
                  }
                }
                items(first: 100, after: "${issueEndCursor}") {
                  pageInfo {
                    endCursor
                    hasNextPage
                    hasPreviousPage
                  }
                  nodes {
                    type
                    content {
                      __typename
                      ... on Issue {
                        id
                        title
                        url
                        closed
                        labels(first: 5) {
                          nodes {
                            name
                          }
                        }
                        milestone {
                          id
                          title
                          description
                          number
                          createdAt
                          dueOn
                          state
                        }
                        assignees(first: 5) {
                          nodes {
                            id
                            login
                            name
                          }
                        }
                      }
                    }
                    fieldValues(first: 10) {
                      nodes {
                        ... on ProjectV2ItemFieldSingleSelectValue {
                          field {
                            ... on ProjectV2SingleSelectField {
                              name
                            }
                          }
                          name
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }`
      );

      projectEndCursor = data.organization.projectsV2.pageInfo.endCursor;
      hasNextProject = data.organization.projectsV2.pageInfo.hasNextPage;
      issueEndCursor =
        data.organization.projectsV2.nodes[0].items.pageInfo.endCursor;
      hasNextIssue =
        data.organization.projectsV2.nodes[0].items.pageInfo.hasNextIssue;

      // Transform the fetched data into the required schema format
      const transformedProjects = data.organization.projectsV2.nodes.map(
        (project: any) => ({
          id: project.id,
          title: project.title,
          gitHubOrgName: gitHubOrgName,
          items: project.items.nodes.map((item: any) => ({
            type: item.type,
            content: {
              id: item.content.id,
              title: item.content.title,
              url: item.content.url,
              closed: item.content.closed,
              labels: item.content.labels?.nodes.map((label: any) => ({
                name: label.name,
              })),
              milestone: item.content.milestone
                ? {
                    id: item.content.milestone.id,
                    title: item.content.milestone.title,
                    description: item.content.milestone.description,
                    number: item.content.milestone.number,
                    createdAt: item.content.milestone.createdAt,
                    dueOn: item.content.milestone.dueOn,
                    state: item.content.milestone.state,
                  }
                : null,
              assignees: item.content.assignees
                ? item.content.assignees.nodes.map((assignee: any) => ({
                    id: assignee.id,
                    login: assignee.login,
                    name: assignee.name,
                  }))
                : [],
              __typename: item.content.__typename,
            },
            fieldValues: item.fieldValues.nodes
              .filter((field: any) => field.field) // Filter out empty objects
              .map((field: any) => ({
                name: field.name,
                field: {
                  name: field.field.name,
                },
              })),
          })),
          fields: project.fields.nodes
            .filter((field: any) => field.options) // Filter out empty objects
            .map((field: any) => ({
              name: field.name,
              options: field.options
                ? field.options.map((option: any) => ({
                    id: option.id,
                    name: option.name,
                  }))
                : [],
            })),
        })
      );

      // Save each project into MongoDB using findOneAndUpdate
      let projectId = 1;
      for (const project of transformedProjects) {
        try {
          const jiraBoard: Omit<JiraBoard, '_id'> = {
            id: projectId++,
            self: project.id,
            name: project.title,
            type: 'GitHub Project',
            jiraLocation: {
              displayName: project.title,
              projectName: project.title,
              name: project.title,
            },
            columns: project.fields.find(
              (field: { name: string }) => field.name === 'Status'
            ).options,
            jiraIssues: [],
            jiraSprints: [],
            course: course._id,
          };

          const board = await JiraBoardModel.findOneAndUpdate(
            { self: project.id },
            jiraBoard,
            {
              upsert: true,
              new: true,
            }
          );

          for (const item of project.items) {
            const jiraIssue: Omit<JiraIssue, '_id'> = {
              id: item.content.id,
              self: item.content.id,
              key: project.title,
              storyPoints: 0,
              fields: {
                summary: item.content.title,
                resolution: item.content.closed ? { name: 'Done' } : undefined,
                issuetype: {
                  name: item.type,
                  subtask: false,
                },
                status: {
                  name:
                    item.fieldValues.find(
                      (fieldValue: { field: { name: string } }) =>
                        fieldValue.field.name === 'Status'
                    )?.name ?? 'Unknown',
                },
                assignee: {
                  displayName:
                    item.content.assignees.length > 0
                      ? item.content.assignees[0].name
                      : null,
                },
              },
            };

            const self = jiraIssue.self;

            const issue = await JiraIssueModel.findOneAndUpdate(
              { self: self },
              jiraIssue,
              {
                upsert: true,
                new: true,
              }
            );

            if (item.content.milestone) {
              const sprint = await JiraSprintModel.findOneAndUpdate(
                { self: item.content.milestone.id },
                {
                  $setOnInsert: {
                    id: item.content.milestone.number,
                    self: item.content.milestone.id,
                    name: item.content.title,
                    jiraIssues: [], // Initialize jiraIssues as an array
                    state:
                      item.content.milestone.state === 'CLOSED'
                        ? 'closed'
                        : 'active',
                    startDate: item.content.milestone.createdAt,
                    endDate: item.content.milestone.dueOn,
                    createdDate: item.content.milestone.createdAt,
                    originBoardId: board.id,
                    goal: item.content.milestone.description,
                  },
                },
                {
                  upsert: true,
                  new: true,
                }
              );

              // Now push the issue into the jiraIssues array
              await JiraSprintModel.findOneAndUpdate(
                { self: item.content.milestone.id },
                { $addToSet: { jiraIssues: issue._id } },
                {}
              );

              await JiraBoardModel.findOneAndUpdate(
                { self: project.id },
                { $addToSet: { jiraSprints: sprint._id } },
                {}
              );
            }

            await JiraBoardModel.findOneAndUpdate(
              { self: project.id },
              { $push: { jiraIssues: issue._id } },
              {}
            );
          }

          console.log('Saved GitHub Project: ', project.title);
        } catch (error) {
          console.error('Error saving GitHub Project: ', project.id, error);
        }
      }
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
