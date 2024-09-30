import cron from 'node-cron';
import { Course } from '@models/Course';
import CourseModel from '@models/Course';

const fetchAndSaveTrofosData = async () => {
  const trofosCourseUri =
    'https://trofos.comp.nus.edu.sg/api/external/v1/course';
  const trofosProjectUri =
    'https://trofos.comp.nus.edu.sg/api/external/v1/project';

  const courses: Course[] = await CourseModel.find();

  for (const course of courses) {
    const {
      trofos: { isRegistered, apiKey },
    } = course;

    if (!isRegistered) {
      continue;
    }

    try {
      const trofosCourseResponse = await fetch(trofosCourseUri, {
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
      const trofosProjectResponse = await fetch(trofosProjectUri, {
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
    } catch (error) {
      console.error('Error in fetching Trofos project:', error);
    }
  }

  console.log('fetchAndSaveTrofosData job done');
};

const setupTrofosJob = () => {
  // Schedule the job to run every day at 01:00 hours
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
