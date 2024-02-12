import {
  JiraData as IJiraData,
} from '@shared/types/JiraData';
import cron from 'node-cron';
import JiraData from '../models/JiraData';

const fetchAndSaveJiraData = async () => {
  const email = 'e0725104@u.nus.edu';
  const apiToken = 'ATATT3xFfGF0MU7KvTMw3qkr7I695_p2yZXuUVGl3TvwJwwo48IxWJrcLwv6afXVsFVMHnsZlM085txmR9WwlH8dbHOIeHgl2-2CsJMANPvu3M6ADJ1t6XJQ3fpV0T-WV9ELYVtXP76sxyNVMgJpD-p1dfGWFYEm7mxiqgvH12_U0PHYbNroPTk=D7392AC5';

  const credentials = btoa(`${email}:${apiToken}`);

  const uri = 'https://nus-crisp.atlassian.net/rest/agile/1.0/board/';

  fetch(uri, {
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
  .then(data => {
    console.log('Response data:', data);
    const boards = data.values;

    boards.forEach(async (boardData: any) => {
      const jiraData: Omit<IJiraData, '_id'> = {
        ...boardData,
        jiraLocation: boardData.location,
        location: undefined // If you want to remove the original location property
      };

      await JiraData.findOneAndUpdate({ id: jiraData.id }, jiraData, {
        upsert: true,
      });
      // board.save()
          // .then(() => console.log('Board saved to MongoDB'))
          // .catch(error => console.error('Error saving board:', error));
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
