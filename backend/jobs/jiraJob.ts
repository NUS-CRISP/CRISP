import { JiraBoard, JiraEpic } from '@shared/types/JiraData';
import { JiraBoardModel, JiraEpicModel, JiraIssueModel, JiraSprintModel } from '../models/JiraData';
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
const apiToken = 'ATATT3xFfGF0MU7KvTMw3qkr7I695_p2yZXuUVGl3TvwJwwo48IxWJrcLwv6afXVsFVMHnsZlM085txmR9WwlH8dbHOIeHgl2-2CsJMANPvu3M6ADJ1t6XJQ3fpV0T-WV9ELYVtXP76sxyNVMgJpD-p1dfGWFYEm7mxiqgvH12_U0PHYbNroPTk=D7392AC5';
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

async function fetchEpics(boardId: number): Promise<any> {
  const jiraEpicUri = `https://nus-crisp.atlassian.net/rest/agile/1.0/board/${boardId}/epic`;

  try {
      const response = await fetch(jiraEpicUri, {
          method: 'GET',
          headers: {
              'Authorization': `Basic ${credentials}`,
              'Content-Type': 'application/json'
          }
      });

      if (!response.ok) {
          throw new Error(`Failed to fetch epics. Status: ${response.status}`);
      }

      const epicIds:(String | null)[] = [];
      const data = await response.json();

      await Promise.all(data.values.map(async (epicData: any) => {
        const jiraEpic: Omit<JiraEpic, '_id'> = {
          ...epicData,
          jiraBoard: await findJiraBoardId(boardId)
        };

        epicIds.push(await JiraEpicModel.findOneAndUpdate({ id: jiraEpic.id }, jiraEpic, {
          upsert: true,
          returnNewDocument: true,
        }));
      }));

      return epicIds;
  } catch (error) {
      console.error('Error fetching epics:', error);
      throw error; // Propagate the error back to the caller
  }
}


const fetchAndSaveJiraData = async () => {
  const jiraBoardUri = 'https://nus-crisp.atlassian.net/rest/agile/1.0/board/';

  fetch(jiraBoardUri, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json'
    }
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
    await JiraEpicModel.deleteMany({});
    await JiraIssueModel.deleteMany({});
    await JiraSprintModel.deleteMany({});

    boards.forEach(async (boardData: any) => {
      const jiraBoard: Omit<JiraBoard, '_id'> = {
        ...boardData,
        jiraLocation: boardData.location,
        location: undefined // If you want to remove the original location property
      };

      await JiraBoardModel.findOneAndUpdate({ id: jiraBoard.id }, jiraBoard, {
        upsert: true,
      });

      const epicIds = await fetchEpics(jiraBoard.id);
      await JiraBoardModel.findOneAndUpdate({ id: jiraBoard.id }, 
        {
          ...jiraBoard,
          jiraEpics: epicIds,
        },
        { upsert: true }
      );
    });
  })
  .catch(error => {
    console.error('There was a problem with your fetch operation:', error);
  });
}

export const setupJob = () => {
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
