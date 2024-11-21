import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import AssessmentResultModel from '../../models/AssessmentResult';
import InternalAssessmentModel from '../../models/InternalAssessment';
import UserModel from '../../models/User';
import SubmissionModel from '../../models/Submission';
import CourseModel from '@models/Course';
import TeamSetModel from '@models/TeamSet';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

beforeEach(async () => {
  await InternalAssessmentModel.deleteMany({});
  await CourseModel.deleteMany({});
  await SubmissionModel.deleteMany({});
  await UserModel.deleteMany({});
  await TeamSetModel.deleteMany({});
  await AssessmentResultModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('AssessmentResult Model', () => {
  it('should create and save an AssessmentResult', async () => {
    const course = await CourseModel.create({
      name: 'Introduction to Computer Science',
      code: 'CS101',
      semester: 'Fall 2024',
      startDate: new Date('2024-08-15'),
      courseType: 'Normal',
    });
    await course.save();

    const teamSet = new TeamSetModel({
      name: 'Team Set 1',
      course: course._id,
      teams: [],
    });
    await teamSet.save();

    const assessment = new InternalAssessmentModel({
      course: course._id,
      assessmentName: 'Midterm Exam',
      description: 'Midterm assessment',
      startDate: new Date().setUTCFullYear(new Date().getUTCFullYear() - 1),
      maxMarks: 100,
      granularity: 'team',
      teamSet: teamSet._id,
      areSubmissionsEditable: true,
      results: [],
      isReleased: false,
      questions: [],
    });

    const student = new UserModel({
      identifier: 'student1',
      name: 'Student One',
    });
    await student.save();

    const marker = new UserModel({
      identifier: 'ta1',
      name: 'TA One',
    });
    await marker.save();

    const submission = new SubmissionModel({
      assessment: assessment._id,
      user: student._id,
      answers: [],
      isDraft: false,
      submittedAt: new Date(),
    });
    await submission.save();

    const assessmentResult = new AssessmentResultModel({
      assessment: assessment._id,
      student: student._id,
      marks: [
        {
          marker: marker._id,
          submission: submission._id,
          score: 90,
        },
      ],
      averageScore: 90,
    });

    const savedResult = await assessmentResult.save();

    expect(savedResult._id).toBeDefined();
    expect(savedResult.assessment.toString()).toBe(assessment._id.toString());
    expect(savedResult.student.toString()).toBe(student._id.toString());
    expect(savedResult.averageScore).toBe(90);
  });

  it('should fail validation when required fields are missing', async () => {
    const assessmentResult = new AssessmentResultModel({});
    await expect(assessmentResult.save()).rejects.toThrow();
  });
});
