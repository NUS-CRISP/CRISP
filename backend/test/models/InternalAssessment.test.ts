import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import InternalAssessmentModel from '../../models/InternalAssessment';
import CourseModel from '../../models/Course';
import TeamSetModel from '../../models/TeamSet';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

beforeEach(async () => {
  await InternalAssessmentModel.deleteMany({});
  await CourseModel.deleteMany({});
  await TeamSetModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('InternalAssessment Model', () => {
  it('should create and save an InternalAssessment', async () => {
    const course = new CourseModel({
      name: 'CS101',
      code: 'CS101',
      semester: 'Fall 2023',
      startDate: new Date('2023-08-15'),
      courseType: 'Normal',
    });
    await course.save();

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
      granularity: 'team',
      teamSet: teamSet._id,
      areSubmissionsEditable: true,
      results: [],
      isReleased: false,
      questions: [],
    });

    const savedAssessment = await assessment.save();

    expect(savedAssessment._id).toBeDefined();
    expect(savedAssessment.assessmentName).toBe('Midterm Exam');
    expect(savedAssessment.teamSet!.toString()).toBe(teamSet._id.toString());
  });

  it('should fail validation when required fields are missing', async () => {
    const assessment = new InternalAssessmentModel({});
    await expect(assessment.save()).rejects.toThrow();
  });
});
