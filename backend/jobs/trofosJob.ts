import cron from 'node-cron';
import { URLSearchParams } from 'url';
import { Course } from '@models/Course';
import CourseModel from '@models/Course';

const fetchAndSaveTrofosData = async () => {
  const trofosCourseUri = 'https://trofos.comp.nus.edu.sg/api/external/v1/course';
  const trofosProjectUri = 'https://trofos.comp.nus.edu.sg/api/external/v1/project';

  const courses: Course[] = await CourseModel.find();

  for (const course of courses) {
    const apiKey = course.trofos.apiKey;

  }
}

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
