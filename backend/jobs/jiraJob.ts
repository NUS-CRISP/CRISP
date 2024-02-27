/* eslint-disable @typescript-eslint/no-explicit-any */
import { JiraBoard, JiraIssue, JiraSprint } from '@shared/types/JiraData';
import {
  JiraBoardModel,
  JiraIssueModel,
  JiraSprintModel,
} from '@models/JiraData';
import cron from 'node-cron';
import { Course } from '../models/Course';
import CourseModel from '../models/Course';

/**
 * Jira Cloud REST API Documentation: https://developer.atlassian.com/cloud/jira/software/rest/api-group-board/
 * Atlassian OAuth 2.0 Documentation: https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/
 */

async function findJiraBoardId(id: number): Promise<String | null> {
  try {
    const jiraBoard = await JiraBoardModel.findOne({ id: id }); // Replace with your criteria
    if (jiraBoard) {
      return jiraBoard._id; // Assuming _id is the ObjectId
    }
    return null;
  } catch (error) {
    console.error('Error finding JiraBoard:', error);
    throw error;
  }
}

async function findJiraSprintId(id: number): Promise<String | null> {
  try {
    const jiraSprint = await JiraSprintModel.findOne({ id: id }); // Replace with your criteria
    if (jiraSprint) {
      return jiraSprint._id; // Assuming _id is the ObjectId
    }
    return null;
  } catch (error) {
    console.error('Error finding JiraSprint:', error);
    throw error;
  }
}

async function fetchSprints(
  boardId: number,
  cloudId: string,
  accessToken: string
): Promise<any> {
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
          jiraBoard: await findJiraBoardId(boardId),
        };

        const sprint = await JiraSprintModel.findOneAndUpdate(
          { id: jiraSprint.id },
          jiraSprint,
          {
            upsert: true,
            new: true,
          }
        );

        await JiraBoardModel.findOneAndUpdate(
          { _id: jiraSprint.jiraBoard },
          { $push: { jiraSprints: sprint._id } },
          {}
        );
      })
    );
  } catch (error) {
    console.error('Error fetching sprints:', error);
    throw error; // Propagate the error back to the caller
  }
}

async function fetchIssues(
  boardId: number,
  cloudId: string,
  accessToken: string
): Promise<any> {
  const jiraIssuesUri = `https://api.atlassian.com/ex/jira/${cloudId}/rest/agile/1.0/board/${boardId}/backlog`;

  try {
    const response = await fetch(jiraIssuesUri, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`, // Use the access token here
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch issues. Status: ${response.status}`);
    }

    const data = await response.json();

    await Promise.all(
      data.issues.map(async (issueData: any) => {
        const jiraIssue: Omit<JiraIssue, '_id'> = {
          ...issueData,
          jiraBoard: await findJiraBoardId(boardId),
          jiraSprint: await findJiraSprintId(issueData.fields?.sprint?.id),
        };

        const issue = await JiraIssueModel.findOneAndUpdate(
          { id: jiraIssue.id },
          jiraIssue,
          {
            upsert: true,
            new: true,
          }
        );

        await JiraSprintModel.findOneAndUpdate(
          { _id: jiraIssue.jiraSprint },
          { $push: { jiraIssues: issue._id } },
          {}
        );

        await JiraBoardModel.findOneAndUpdate(
          { _id: jiraIssue.jiraBoard },
          { $push: { jiraIssues: issue._id } },
          {}
        );
      })
    );
  } catch (error) {
    console.error('Error fetching sprints:', error);
    throw error; // Propagate the error back to the caller
  }
}

export const fetchAndSaveJiraData = async () => {
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const courses: Course[] = await CourseModel.find();

  for (const course of courses) {
    const { isRegistered, accessToken, refreshToken, cloudId } = course.jira;

    if (!isRegistered) {
      continue;
    }

    // Define the token endpoint URL
    const tokenUrl = 'https://auth.atlassian.com/oauth/token';
    const jiraBoardUri = `https://api.atlassian.com/ex/jira/${cloudId}/rest/agile/1.0/board`;

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
      const newAccessToken = data.access_token;
      const newRefreshToken = data.refresh_token;

      // Update the access token in the database
      await CourseModel.findByIdAndUpdate(course._id, {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
      console.log(`Access token refreshed for course with cloudId: ${cloudId}`);
    } else {
      console.error(
        `Failed to refresh access token for course with cloudId: ${cloudId}`
      );
    }

    fetch(jiraBoardUri, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`, // Use the access token here
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
        console.log('Response data:', data);
        const boards = data.values;

        await JiraBoardModel.deleteMany({});
        await JiraIssueModel.deleteMany({});
        await JiraSprintModel.deleteMany({});

        boards.forEach(async (boardData: any) => {
          const jiraBoard: Omit<JiraBoard, '_id'> = {
            ...boardData,
            jiraLocation: boardData.location,
            location: undefined, // To remove the original location property
          };

          await JiraBoardModel.findOneAndUpdate(
            { id: jiraBoard.id },
            jiraBoard,
            {
              upsert: true,
            }
          );

          await fetchSprints(jiraBoard.id, cloudId, accessToken);
          await fetchIssues(jiraBoard.id, cloudId, accessToken);
        });
      })
      .catch(error => {
        console.error('There was a problem with your fetch operation:', error);
      });
  }
};

const setupJiraJob = () => {
  // Schedule the job to run every day at midnight
  cron.schedule('0 0 * * *', async () => {
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
