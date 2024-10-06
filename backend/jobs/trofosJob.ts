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
      columns: singleTrofosProjectData.backlogStatuses.map((status: { name: string; }) => ({
        name: status.name,
      })),
      jiraSprints: [],
      jiraIssues: [],
      course: course._id
    };

    await JiraBoardModel.findOneAndUpdate(
      { self: singleTrofosProjectUri },
      transformedJiraBoard,
      {
        upsert: true,
        new: true,
      }
    );

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

    const transformedSprints = trofosSprintData.sprints.map((sprint: any) => ({
      id: sprint.id,
      self: `${trofosSprintUri}/${sprint.id}`, // Assuming `trofosSprintUri` is defined elsewhere
      state: sprint.status === 'current' ? 'active' : 'future', // Map status
      name: sprint.name,
      startDate: new Date(sprint.start_date),
      endDate: new Date(sprint.end_date),
      createdDate: new Date(sprint.start_date),
      originBoardId: sprint.project_id, // Relating it to the board ID
      goal: sprint.goals || '', // Default to empty string if no goals
      jiraIssues: [] // You can populate this later or leave it empty for now
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

        console.log(`Saved sprint with ID: ${sprintData.id}`);
      } catch (error) {
        console.error(`Error saving sprint with ID: ${sprintData.id}`, error);
      }
    }

    await saveBacklogToDatabase(trofosSprintData);

  } catch (error) {
    console.error('Error in fetching sprints from a Trofos project:', error);
  }
};

const saveBacklogToDatabase = async (trofosSprintData: any[]) => {

}


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
