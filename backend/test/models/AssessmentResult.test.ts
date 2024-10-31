import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import AssessmentResultModel from '../../models/AssessmentResult';
import InternalAssessmentModel from '../../models/InternalAssessment';
import UserModel from '../../models/User';
import SubmissionModel from '../../models/Submission';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('AssessmentResult Model', () => {
  it('should create and save an AssessmentResult', async () => {
    const assessment = new InternalAssessmentModel({
      assessmentName: 'Quiz 1',
      description: 'First quiz',
      startDate: new Date(),
      granularity: 'individual',
      areSubmissionsEditable: true,
      isReleased: false,
    });
    await assessment.save();

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
