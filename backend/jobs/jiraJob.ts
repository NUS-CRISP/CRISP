/* eslint-disable @typescript-eslint/no-explicit-any */
import { JiraBoard, JiraIssue, JiraSprint } from '@shared/types/JiraData';
import {
  JiraBoardModel,
  JiraIssueModel,
  JiraSprintModel,
} from '@models/JiraData';
import cron from 'node-cron';
import { Course } from '@models/Course';
import CourseModel from '@models/Course';
import mongoose from 'mongoose';

/**
 * Jira Cloud REST API Documentation: https://developer.atlassian.com/cloud/jira/software/rest/api-group-board/
 * Atlassian OAuth 2.0 Documentation: https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/
 */

async function findJiraBoardId(
  id: number,
  cloudId: string
): Promise<mongoose.Types.ObjectId | null> {
  try {
    const selfUri = `https://api.atlassian.com/ex/jira/${cloudId}/rest/agile/1.0/board/${id}`;
    const jiraBoard = await JiraBoardModel.findOne({ self: selfUri });
    if (jiraBoard) {
      return jiraBoard._id;
    }
    return null;
  } catch (error) {
    console.error('Error finding JiraBoard:', error);
    throw error;
  }
}

async function findJiraSprintId(
  id: number,
  cloudId: string
): Promise<mongoose.Types.ObjectId | null> {
  try {
    const selfUri = `https://api.atlassian.com/ex/jira/${cloudId}/rest/agile/1.0/sprint/${id}`;
    const jiraSprint = await JiraSprintModel.findOne({ self: selfUri });
    if (jiraSprint) {
      return jiraSprint._id;
    }
    return null;
  } catch (error) {
    console.error('Error finding JiraSprint:', error);
    throw error;
  }
}

async function findJiraSprintIds(
  ids: number[],
  cloudId: string
): Promise<mongoose.Types.ObjectId[]> {
  try {
    const jiraSprints: mongoose.Types.ObjectId[] = [];

    for (const id of ids) {
      const selfUri = `https://api.atlassian.com/ex/jira/${cloudId}/rest/agile/1.0/sprint/${id}`;
      const jiraSprint = await JiraSprintModel.findOne({ self: selfUri });

      if (jiraSprint) {
        jiraSprints.push(jiraSprint._id);
      }
    }

    return jiraSprints;
  } catch (error) {
    console.error('Error finding JiraSprints:', error);
    throw error;
  }
}

async function findJiraIssueId(
  id: number,
  cloudId: string
): Promise<mongoose.Types.ObjectId | null> {
  try {
    const selfUri = `https://api.atlassian.com/ex/jira/${cloudId}/rest/agile/1.0/issue/${id}`;
    const jiraIssue = await JiraIssueModel.findOne({ self: selfUri });
    if (jiraIssue) {
      return jiraIssue._id;
    }
    return null;
  } catch (error) {
    console.error('Error finding JiraIssue:', error);
    throw error;
  }
}

async function fetchSprints(
  boardId: number,
  cloudId: string,
  accessToken: string
) {
  const jiraSprintUri = `https://api.atlassian.com/ex/jira/${cloudId}/rest/agile/1.0/board/${boardId}/sprint`;

  try {
    const response = await fetch(jiraSprintUri, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sprints. Status: ${response.status}`);
    }

    const data = await response.json();

    await Promise.all(
      data.values.map(async (sprintData: any) => {
        const jiraSprint: Omit<JiraSprint, '_id'> = {
          ...sprintData,
          jiraIssues: [],
        };

        const jiraSprintId = await findJiraSprintId(jiraSprint.id, cloudId);

        let sprint;
        if (jiraSprintId) {
          sprint = await JiraSprintModel.findOneAndUpdate(
            { _id: jiraSprintId },
            jiraSprint,
            {
              upsert: true,
              new: true,
            }
          );
        } else {
          sprint = await new JiraSprintModel(jiraSprint).save();
        }

        const jiraBoardId = await findJiraBoardId(boardId, cloudId);

        await JiraBoardModel.findOneAndUpdate(
          { _id: jiraBoardId },
          { $push: { jiraSprints: sprint._id } },
          {}
        );
      })
    );
  } catch (error) {
    console.error('Error fetching sprints:', error);
  }
}

async function fetchIssues(
  boardId: number,
  cloudId: string,
  accessToken: string
): Promise<any> {
  const jiraIssuesUri = `https://api.atlassian.com/ex/jira/${cloudId}/rest/agile/1.0/board/${boardId}/issue`;

  try {
    const response = await fetch(jiraIssuesUri, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch issues. Status: ${response.status}`);
    }

    const data = await response.json();
    await Promise.all(
      data.issues.map(async (issueData: any) => {
        const issueKey = issueData.key;
        const storyPointsUri = `https://api.atlassian.com/ex/jira/${cloudId}/rest/agile/1.0/issue/${issueKey}/estimation?boardId=${boardId}`;

        const storyPointsResponse = await fetch(storyPointsUri, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });

        let storyPoints = 0;

        if (storyPointsResponse.ok) {
          storyPoints = (await storyPointsResponse.json()).value;
        } else {
          console.error(
            `Failed to fetch story points. Status: ${storyPointsResponse.status}`
          );
        }

        const jiraIssue: Omit<JiraIssue, '_id'> = {
          ...issueData,
          storyPoints: storyPoints,
        };

        const jiraIssueId = await findJiraIssueId(issueData.id, cloudId);

        let issue;
        if (jiraIssueId) {
          issue = await JiraIssueModel.findOneAndUpdate(
            { _id: jiraIssueId },
            jiraIssue,
            {
              upsert: true,
              new: true,
            }
          );
        } else {
          issue = await new JiraIssueModel(jiraIssue).save();
        }

        // Not required at the moment as the array from customfield_10020 includes active sprint.
        // const jiraSprintId = await findJiraSprintId(
        //   issueData.fields?.sprint?.id,
        //   cloudId
        // );

        // await JiraSprintModel.findOneAndUpdate(
        //   { _id: jiraSprintId },
        //   { $push: { jiraIssues: issue._id } },
        //   {}
        // );

        if (issueData.fields.customfield_10020) {
          const jiraSprintIds = await findJiraSprintIds(
            issueData.fields.customfield_10020.map(
              (sprint: { id: number }) => sprint.id
            ),
            cloudId
          );

          for (const id of jiraSprintIds) {
            await JiraSprintModel.findOneAndUpdate(
              { _id: id },
              { $push: { jiraIssues: issue._id } },
              {}
            );
          }
        }

        const jiraBoardId = await findJiraBoardId(boardId, cloudId);

        await JiraBoardModel.findOneAndUpdate(
          { _id: jiraBoardId },
          { $push: { jiraIssues: issue._id } },
          {}
        );
      })
    );
  } catch (error) {
    console.error('Error fetching issues:', error);
  }
}

export const fetchAndSaveJiraData = async () => {
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const courses: Course[] = await CourseModel.find();

  for (const course of courses) {
    const { isRegistered, cloudIds } = course.jira;
    let { accessToken, refreshToken } = course.jira;

    if (!isRegistered) {
      continue;
    }

    // Define the token endpoint URL
    const tokenUrl = 'https://auth.atlassian.com/oauth/token';

    // Define the request parameters
    const tokenParams = {
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    };

    // Make a POST request to the token endpoint
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokenParams),
    });

    // Check if the request was successful
    if (response.ok) {
      const data = await response.json();
      accessToken = data.access_token;
      refreshToken = data.refresh_token;

      // Update the access token in the database
      await CourseModel.findByIdAndUpdate(course._id, {
        $set: {
          'jira.accessToken': accessToken,
          'jira.refreshToken': refreshToken,
        },
      });

      console.log(
        `Access token refreshed for course with courseId: ${course._id}`
      );
    } else {
      console.error(
        `Failed to refresh access token for course with courseId: ${course._id}`
      );
    }

    for (const cloudId of cloudIds) {
      const jiraBoardUri = `https://api.atlassian.com/ex/jira/${cloudId}/rest/agile/1.0/board`;

      fetch(jiraBoardUri, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then(async data => {
          const boards = data.values;

          boards.forEach(async (boardData: any) => {
            try {
              const boardId = await boardData.id;
              const jiraBoardConfigurationUri = `https://api.atlassian.com/ex/jira/${cloudId}/rest/agile/1.0/board/${boardId}/configuration`;

              const boardConfigurationResponse = await fetch(
                jiraBoardConfigurationUri,
                {
                  method: 'GET',
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json',
                  },
                }
              );

              if (!boardConfigurationResponse.ok) {
                throw new Error(
                  `Failed to fetch board configuration. Status: ${boardConfigurationResponse.status}`
                );
              }

              const boardConfigurationData =
                await boardConfigurationResponse.json();

              const jiraBoard: Omit<JiraBoard, '_id'> = {
                ...boardData,
                jiraLocation: boardData.location,
                columns: boardConfigurationData.columnConfig.columns,
                jiraIssues: [],
                jiraSprints: [],
                course: course._id,
                location: undefined, // To remove the original location property
              };

              const boardSelfUri = `https://api.atlassian.com/ex/jira/${cloudId}/rest/agile/1.0/board/${jiraBoard.id}`;

              await JiraBoardModel.findOneAndUpdate(
                { self: boardSelfUri },
                jiraBoard,
                {
                  upsert: true,
                  new: true,
                }
              );

              await fetchSprints(jiraBoard.id, cloudId, accessToken);
              await fetchIssues(jiraBoard.id, cloudId, accessToken);
            } catch (error) {
              console.error('Error in forEach loop:', error);
            }
          });
        })
        .catch(error => {
          console.error(
            'There was a problem with your fetch operation:',
            error
          );
        });
    }
  }

  console.log('fetchAndSaveJiraData job done');
};

const setupJiraJob = () => {
  // Schedule the job to run every day at 01:00 hours
  cron.schedule('0 1 * * *', async () => {
    console.log('Running fetchAndSaveJiraData job:', new Date().toString());
    try {
      await fetchAndSaveJiraData();
    } catch (err) {
      console.error('Error in cron job fetchAndSaveJiraData:', err);
    }
  });

  // To run the job immediately for testing
  if (process.env.RUN_JOB_NOW === 'true') {
    fetchAndSaveJiraData().catch(err => {
      console.error('Error running job manually:', err);
    });
  }
};

export default setupJiraJob;
