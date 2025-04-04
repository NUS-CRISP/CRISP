import cron from 'node-cron';
import { URLSearchParams } from 'url';
import { Course } from '@models/Course';
import CourseModel from '@models/Course';
import {
  JiraBoardModel,
  JiraIssueModel,
  JiraSprintModel,
} from '@models/JiraData';
import { JiraBoard, JiraIssue, JiraSprint } from '@shared/types/JiraData';
import {
  BOARD_API_PATH,
  ISSUE_API_PATH,
  JIRA_API_BASE_URL,
} from '../utils/endpoints';
import { refreshAccessToken } from '../utils/jira';

async function fetchSprints(
  boardId: number,
  cloudId: string,
  accessToken: string
) {
  const jiraSprintUri = `${JIRA_API_BASE_URL}/${cloudId}${BOARD_API_PATH}/${boardId}/sprint`;

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
      data.values.map(async (sprintData: JiraSprint) => {
        const jiraSprint: Omit<JiraSprint, '_id'> = {
          ...sprintData,
          jiraIssues: [],
        };

        const self = jiraSprint.self;
        const sprint = await JiraSprintModel.findOneAndUpdate(
          { self: self },
          jiraSprint,
          {
            upsert: true,
            new: true,
          }
        );

        const boardSelfUri = `${JIRA_API_BASE_URL}/${cloudId}${BOARD_API_PATH}/${boardId}`;

        await JiraBoardModel.findOneAndUpdate(
          { self: boardSelfUri },
          { $push: { jiraSprints: sprint._id } },
          {}
        );
      })
    );
  } catch (error) {
    console.error('Error fetching sprints:', error);
    throw error;
  }
}

async function fetchStoryPoints(
  issueKey: string,
  boardId: number,
  cloudId: string,
  accessToken: string
): Promise<number> {
  const params = new URLSearchParams({
    boardId: boardId.toString(),
  });

  const storyPointsUri = `${JIRA_API_BASE_URL}/${cloudId}${ISSUE_API_PATH}/${issueKey}/estimation?${params}`;

  try {
    const storyPointsResponse = await fetch(storyPointsUri, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (storyPointsResponse.ok) {
      const storyPointsData = await storyPointsResponse.json();
      return storyPointsData.value;
    } else {
      console.error(
        `Failed to fetch story points. Status: ${storyPointsResponse.status}`
      );
      return 0; // Default to 0 if fetch fails
    }
  } catch (error) {
    console.error('Error fetching story points:', error);
    return 0; // Default to 0 in case of errors
  }
}

async function fetchIssues(
  boardId: number,
  cloudId: string,
  accessToken: string
) {
  const params = new URLSearchParams({
    maxResults: '300',
  });

  const jiraIssuesUri = `${JIRA_API_BASE_URL}/${cloudId}${BOARD_API_PATH}/${boardId}/issue?${params}`;

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
      data.issues.map(async (issueData: JiraIssue) => {
        const issueKey = issueData.key;

        const storyPoints = await fetchStoryPoints(
          issueKey,
          boardId,
          cloudId,
          accessToken
        );

        const jiraIssue: Omit<JiraIssue, '_id'> = {
          ...issueData,
          storyPoints: storyPoints,
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

        if (issueData.fields.sprint) {
          const sprintSelfUri = issueData.fields.sprint.self;

          await JiraSprintModel.findOneAndUpdate(
            { self: sprintSelfUri },
            { $push: { jiraIssues: issue._id } },
            {}
          );
        }

        if (issueData.fields.closedSprints) {
          const closedSprints = issueData.fields.closedSprints;

          closedSprints.forEach(async (closedSprint: { self: string }) => {
            const sprintSelfUri = closedSprint.self;

            await JiraSprintModel.findOneAndUpdate(
              { self: sprintSelfUri },
              { $push: { jiraIssues: issue._id } },
              {}
            );
          });
        }

        const boardSelfUri = `${JIRA_API_BASE_URL}/${cloudId}${BOARD_API_PATH}/${boardId}`;

        await JiraBoardModel.findOneAndUpdate(
          { self: boardSelfUri },
          { $push: { jiraIssues: issue._id } },
          {}
        );
      })
    );
  } catch (error) {
    console.error('Error fetching issues:', error);
    throw error;
  }
}

const fetchJiraBoardConfiguration = async (
  boardId: string,
  cloudId: string,
  accessToken: string
) => {
  const jiraBoardConfigurationUri = `${JIRA_API_BASE_URL}/${cloudId}${BOARD_API_PATH}/${boardId}/configuration`;

  const boardConfigurationResponse = await fetch(jiraBoardConfigurationUri, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!boardConfigurationResponse.ok) {
    throw new Error(
      `Failed to fetch board configuration. Status: ${boardConfigurationResponse.status}`
    );
  }

  const boardConfigurationData = await boardConfigurationResponse.json();
  return boardConfigurationData;
};

export const fetchAndSaveJiraData = async () => {
  const courses: Course[] = await CourseModel.find();

  const currDate = new Date();

  for (const course of courses) {
    const { isRegistered, cloudIds, refreshToken } = course.jira;

    const endDate = new Date(course.startDate);
    endDate.setDate(endDate.getDate() + course.durationWeeks * 7);

    if (!isRegistered || currDate < course.startDate || currDate > endDate) {
      continue;
    }

    try {
      const accessToken = await refreshAccessToken(refreshToken, course._id);

      for (const cloudId of cloudIds) {
        try {
          const jiraBoardUri = `${JIRA_API_BASE_URL}/${cloudId}${BOARD_API_PATH}`;

          const boardResponse = await fetch(jiraBoardUri, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
          });

          if (!boardResponse.ok) {
            throw new Error('Network response was not ok');
          }

          const boardData = await boardResponse.json();

          for (const boardDataItem of boardData.values) {
            try {
              const boardId = boardDataItem.id;

              const boardConfigurationData = await fetchJiraBoardConfiguration(
                boardId,
                cloudId,
                accessToken
              );

              const jiraBoard: Omit<JiraBoard, '_id'> = {
                ...boardDataItem,
                jiraLocation: boardDataItem.location,
                columns: boardConfigurationData.columnConfig.columns,
                jiraIssues: [],
                jiraSprints: [],
                course: course._id,
                location: undefined,
              };

              const boardSelfUri = `${JIRA_API_BASE_URL}/${cloudId}${BOARD_API_PATH}/${jiraBoard.id}`;

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
              console.error('Error in inner loop (board related):', error);
            }
          }
        } catch (error) {
          console.error('Error in inner loop (cloudId related):', error);
        }
      }
    } catch (error) {
      console.error('Error in outer loop (access token related):', error);
    }
  }

  console.log('fetchAndSaveJiraData job done');
};

const setupJiraJob = () => {
  // Schedule the job to run every day at 04:00 hours
  cron.schedule('0 4 * * *', async () => {
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
