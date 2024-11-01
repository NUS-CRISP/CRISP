import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import SubmissionModel from '../../models/Submission';
import UserModel from '../../models/User';
import InternalAssessmentModel from '../../models/InternalAssessment';
import QuestionModel from '../../models/Question';
import { CourseType } from '@shared/types/Course';
import CourseModel from '@models/Course';
import { NUSNETIDAnswerModel } from '@models/Answer';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Submission Model', () => {
  it('should create and save a Submission with answers', async () => {
    const user = new UserModel({
      identifier: 'student1',
      name: 'Student One',
    });
    await user.save();
    const courseData: any = {
      name: 'Test Course',
      code: 'COURSE101',
      semester: 'Spring 2023',
      startDate: new Date('2024-08-15'),
      courseType: 'Normal' as CourseType,
    };

    const course = new CourseModel(courseData);

    const savedCourse = await course.save();

    const assessment = new InternalAssessmentModel({
      assessmentName: 'Quiz 1',
      description: 'First quiz',
      startDate: new Date(),
      granularity: 'individual',
      areSubmissionsEditable: true,
      isReleased: false,
      course: savedCourse._id,
    });
    await assessment.save();

    const question = new QuestionModel({
      text: 'Enter your NUSNET ID',
      type: 'NUSNET ID',
      isRequired: true,
    });
    await question.save();

    const answer = new NUSNETIDAnswerModel({
      question: question._id,
      type: 'NUSNET ID',
      value: 'E1234567',
    });

    const submission = new SubmissionModel({
      assessment: assessment._id,
      user: user._id,
      answers: [answer],
      isDraft: false,
      submittedAt: new Date(),
    });

    const savedSubmission = await submission.save();

    expect(savedSubmission._id).toBeDefined();
    expect(savedSubmission.user.toString()).toBe(user._id.toString());
    expect(savedSubmission.answers.length).toBe(1);
  });

  it('should fail validation when required fields are missing', async () => {
    const submission = new SubmissionModel({});
    await expect(submission.save()).rejects.toThrow();
  });
});
