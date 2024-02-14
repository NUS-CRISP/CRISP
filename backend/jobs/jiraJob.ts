import { JiraBoard, JiraIssue, JiraSprint } from '@shared/types/JiraData';
import {
  JiraBoardModel,
  JiraIssueModel,
  JiraSprintModel,
} from '../models/JiraData';
import cron from 'node-cron';

/**
 * Jira Cloud REST API Documentation: https://developer.atlassian.com/cloud/jira/software/rest/api-group-board/
 *
 * Get all boards: https://your-domain.atlassian.com/rest/agile/1.0/board
 * Get epics: https://your-domain.atlassian.com/rest/agile/1.0/board/{boardId}/epic
 * Get issues: https://your-domain.atlassian.com/rest/agile/1.0/board/{boardId}/backlog
 * Get sprints: https://your-domain.atlassian.com/rest/agile/1.0/board/{boardId}/sprint
 */

const email = 'e0725104@u.nus.edu';
const apiToken =
  'ATATT3xFfGF0MU7KvTMw3qkr7I695_p2yZXuUVGl3TvwJwwo48IxWJrcLwv6afXVsFVMHnsZlM085txmR9WwlH8dbHOIeHgl2-2CsJMANPvu3M6ADJ1t6XJQ3fpV0T-WV9ELYVtXP76sxyNVMgJpD-p1dfGWFYEm7mxiqgvH12_U0PHYbNroPTk=D7392AC5';
const credentials = btoa(`${email}:${apiToken}`);

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

async function fetchSprints(boardId: number): Promise<any> {
  const jiraSprintUri = `https://nus-crisp.atlassian.net/rest/agile/1.0/board/${boardId}/sprint`;

  try {
    const response = await fetch(jiraSprintUri, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
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

async function fetchIssues(boardId: number): Promise<any> {
  const jiraIssuesUri = `https://nus-crisp.atlassian.net/rest/agile/1.0/board/${boardId}/backlog`;

  try {
    const response = await fetch(jiraIssuesUri, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
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

const fetchAndSaveJiraData = async () => {
  const jiraBoardUri = 'https://nus-crisp.atlassian.net/rest/agile/1.0/board/';

  fetch(jiraBoardUri, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${credentials}`,
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

        await JiraBoardModel.findOneAndUpdate({ id: jiraBoard.id }, jiraBoard, {
          upsert: true,
        });

        await fetchSprints(jiraBoard.id);
        await fetchIssues(jiraBoard.id);
      });
    })
    .catch(error => {
      console.error('There was a problem with your fetch operation:', error);
    });
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
