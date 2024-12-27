import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import SubmissionModel from '../../models/Submission';
import UserModel from '../../models/User';
import InternalAssessmentModel from '../../models/InternalAssessment';
import QuestionModel from '../../models/Question';
import { CourseType } from '@shared/types/Course';
import CourseModel from '@models/Course';
import { NUSNETIDAnswerModel } from '@models/Answer';
import TeamSetModel from '@models/TeamSet';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

beforeEach(async () => {
  await InternalAssessmentModel.deleteMany({});
  await UserModel.deleteMany({});
  await QuestionModel.deleteMany({});
  await CourseModel.deleteMany({});
  await TeamSetModel.deleteMany({});
  await NUSNETIDAnswerModel.deleteMany({});
  await SubmissionModel.deleteMany({});
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const courseData: any = {
      name: 'Test Course',
      code: 'COURSE101',
      semester: 'Spring 2023',
      startDate: new Date('2024-08-15'),
      courseType: 'Normal' as CourseType,
    };

    const course = new CourseModel(courseData);

    const teamSet = new TeamSetModel({
      name: 'Team Set 1',
      course: course._id,
      teams: [],
    });
    await teamSet.save();

    const startDate = new Date();
    startDate.setUTCFullYear(new Date().getUTCFullYear() - 1);
    const assessment = new InternalAssessmentModel({
      course: course._id,
      assessmentName: 'Midterm Exam',
      description: 'Midterm assessment',
      startDate: startDate,
      maxMarks: 100,
      scaleToMaxMarks: true,
      granularity: 'team',
      teamSet: teamSet._id,
      areSubmissionsEditable: true,
      results: [],
      isReleased: true,
      questions: [],
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
