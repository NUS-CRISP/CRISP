import cron from 'node-cron';
import { Course } from '@models/Course';
import CourseModel from '@models/Course';
import {
  JiraBoardModel,
  JiraIssueModel,
  JiraSprintModel,
} from '@models/JiraData';
import { JiraBoard, JiraIssue, JiraSprint } from '@shared/types/JiraData';
import {
  TROFOS_COURSE_URI,
  TROFOS_PROJECT_URI,
  TROFOS_SPRINT_PATH,
} from '../utils/endpoints';

const fetchAndSaveTrofosData = async () => {
  const courses: Course[] = await CourseModel.find();

  for (const course of courses) {
    const {
      trofos: { isRegistered, apiKey },
    } = course;

    if (!isRegistered) {
      continue;
    }

    try {
      const trofosCourseResponse = await fetch(TROFOS_COURSE_URI, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!trofosCourseResponse.ok) {
        throw new Error('Network response was not ok');
      }

      const trofosCourseData = await trofosCourseResponse.json();
      console.log(trofosCourseData);
    } catch (error) {
      console.error('Error in fetching Trofos course:', error);
    }

    try {
      const trofosProjectResponse = await fetch(TROFOS_PROJECT_URI, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!trofosProjectResponse.ok) {
        throw new Error('Network response was not ok');
      }

      const trofosProjectData = await trofosProjectResponse.json();
      console.log(trofosProjectData);

      for (const trofosProject of trofosProjectData) {
        const trofosProjectId = trofosProject.id;
        await fetchSingleTrofosProject(course, trofosProjectId, apiKey);
      }
    } catch (error) {
      console.error('Error in fetching Trofos project:', error);
    }
  }

  console.log('fetchAndSaveTrofosData job done');
};

const fetchSingleTrofosProject = async (
  course: any,
  trofosProjectId: number,
  apiKey: string
) => {
  const singleTrofosProjectUri = `${TROFOS_PROJECT_URI}/${trofosProjectId}`;

  try {
    const singleTrofosProjectResponse = await fetch(singleTrofosProjectUri, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!singleTrofosProjectResponse.ok) {
      throw new Error('Network response was not ok');
    }

    const singleTrofosProjectData = await singleTrofosProjectResponse.json();

    // Transform the trofos project data to fit the JiraBoard interface
    const transformedJiraBoard: Omit<JiraBoard, '_id'> = {
      id: singleTrofosProjectData.id,
      self: singleTrofosProjectUri,
      name: singleTrofosProjectData.pname,
      type: 'Trofos',
      jiraLocation: {
        projectId: singleTrofosProjectData.id,
        displayName: singleTrofosProjectData.pname,
        projectName: singleTrofosProjectData.pname,
        projectKey: singleTrofosProjectData.pkey,
        projectTypeKey: undefined, // Optional field, set according to your logic
        avatarURI: undefined, // Optional field, set if available
        name: singleTrofosProjectData.pname,
      },
      columns: singleTrofosProjectData.backlogStatuses.map(
        (status: { name: string }) => ({
          name: status.name,
        })
      ),
      jiraSprints: [],
      jiraIssues: [],
      course: course._id,
    };

    await JiraBoardModel.findOneAndUpdate(
      { self: singleTrofosProjectUri },
      transformedJiraBoard,
      {
        upsert: true,
        new: true,
      }
    );

    console.log(`Saved Trofos project with ID: ${transformedJiraBoard.id}`);

    await fetchSprintsFromSingleTrofosProject(trofosProjectId, apiKey);
  } catch (error) {
    console.error('Error in fetching single Trofos project:', error);
  }
};

const fetchSprintsFromSingleTrofosProject = async (
  trofosProjectId: number,
  apiKey: string
) => {
  const trofosSprintUri = `${TROFOS_PROJECT_URI}/${trofosProjectId}${TROFOS_SPRINT_PATH}`;

  try {
    const trofosSprintResponse = await fetch(trofosSprintUri, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!trofosSprintResponse.ok) {
      throw new Error('Network response was not ok');
    }

    const trofosSprintData = await trofosSprintResponse.json();

    const transformedSprints: Omit<JiraSprint, '_id'>[] = trofosSprintData.sprints.map((sprint: any) => ({
      id: sprint.id,
      self: `${trofosSprintUri}/${sprint.id}`, // Assuming `trofosSprintUri` is defined elsewhere
      state:
        sprint.status === 'current'
          ? 'active'
          : sprint.status === 'upcoming'
            ? 'future'
            : 'closed',
      name: sprint.name,
      startDate: new Date(sprint.start_date),
      endDate: new Date(sprint.end_date),
      createdDate: new Date(sprint.start_date),
      originBoardId: sprint.project_id, // Relating it to the board ID
      goal: sprint.goals || '', // Default to empty string if no goals
      jiraIssues: [],
    }));

    // Iterate over each transformed sprint and save to the database
    for (const sprintData of transformedSprints) {
      try {
        const sprint = await JiraSprintModel.findOneAndUpdate(
          { self: sprintData.self },
          sprintData,
          {
            upsert: true,
            new: true,
          }
        );

        const boardSelfUri = `${TROFOS_PROJECT_URI}/${trofosProjectId}`;
        await JiraBoardModel.findOneAndUpdate(
          { self: boardSelfUri },
          { $push: { jiraSprints: sprint._id } },
          {}
        );

        console.log(`Saved Trofos sprint with ID: ${sprintData.id}`);
      } catch (error) {
        console.error(
          `Error saving Trofos sprint with ID: ${sprintData.id}`,
          error
        );
      }
    }

    await saveBacklogToDatabase(trofosSprintData);
  } catch (error) {
    console.error('Error in fetching sprints from a Trofos project:', error);
  }
};

const saveBacklogToDatabase = async (trofosSprintData: any) => {
  for (const sprint of trofosSprintData.sprints) {
    const backlogItems = sprint.backlogs;

    // Iterate through each backlog item in the sprint
    for (const backlog of backlogItems) {
      const trofosSprintUri = `${TROFOS_PROJECT_URI}/${sprint.project_id}${TROFOS_SPRINT_PATH}/${sprint.id}`;

      const transformedBacklog: Omit<JiraIssue, '_id'> = {
        id: backlog.backlog_id, // Assuming 'backlog_id' is the equivalent of 'id'
        self: `${trofosSprintUri}/${backlog.backlog_id}`,
        key: `${trofosSprintUri}/${backlog.backlog_id}`,
        storyPoints: backlog.points || 0, // Default to 0 if no points are provided
        fields: {
          summary: backlog.summary,
          issuetype: {
            name: backlog.type, // Type of issue, e.g., "story", "bug"
            subtask: false, // Assuming no subtasks, adjust if needed
          },
          status: {
            name: backlog.status, // Status of the backlog item
          },
          assignee: backlog.assignee
            ? { displayName: backlog.assignee.user.user_display_name }
            : undefined, // If there's an assignee, map it
        },
      };

      try {
        const issue = await JiraIssueModel.findOneAndUpdate(
          { self: transformedBacklog.self },
          transformedBacklog,
          {
            upsert: true,
            new: true,
          }
        );

        const boardSelfUri = `${TROFOS_PROJECT_URI}/${backlog.project_id}`;
        await JiraBoardModel.findOneAndUpdate(
          { self: boardSelfUri },
          { $push: { jiraIssues: issue._id } },
          {}
        );

        await JiraSprintModel.findOneAndUpdate(
          { self: trofosSprintUri },
          { $push: { jiraIssues: issue._id } },
          {}
        );

        console.log(`Saved Trofos backlog item with ID: ${backlog.backlog_id}`);
      } catch (error) {
        console.error(
          `Error saving Trofos backlog item with ID: ${backlog.backlog_id}`,
          error
        );
      }
    }
  }
};

const setupTrofosJob = () => {
  // Schedule the job to run every day at 03:00 hours
  cron.schedule('0 3 * * *', async () => {
    console.log('Running fetchAndSaveTrofosData job:', new Date().toString());
    try {
      await fetchAndSaveTrofosData();
    } catch (err) {
      console.error('Error in cron job fetchAndSaveTrofosData:', err);
    }
  });

  // To run the job immediately for testing
  if (process.env.RUN_JOB_NOW === 'true') {
    fetchAndSaveTrofosData().catch(err => {
      console.error('Error running job manually:', err);
    });
  }
};

export default setupTrofosJob;
