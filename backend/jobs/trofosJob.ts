import cron from 'node-cron';
import { Course } from '@models/Course';
import CourseModel from '@models/Course';
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
        await fetchSingleTrofosProject(trofosProjectId, apiKey);
      }
    } catch (error) {
      console.error('Error in fetching Trofos project:', error);
    }
  }

  console.log('fetchAndSaveTrofosData job done');
};

const fetchSingleTrofosProject = async (
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
    console.log(singleTrofosProjectData);

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
    console.log(trofosSprintData);
  } catch (error) {
    console.error('Error in fetching sprints from a Trofos project:', error);
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
