import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import SubmissionModel from '../../models/Submission';
import UserModel from '../../models/User';
import InternalAssessmentModel from '../../models/InternalAssessment';
import QuestionModel from '../../models/Question';

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

    const assessment = new InternalAssessmentModel({
      assessmentName: 'Quiz 1',
      description: 'First quiz',
      startDate: new Date(),
      granularity: 'individual',
      areSubmissionsEditable: true,
      isReleased: false,
    });
    await assessment.save();

    const question = new QuestionModel({
      text: 'Enter your NUSNET ID',
      type: 'NUSNET ID',
      isRequired: true,
    });
    await question.save();

    const NUSNETIDAnswerSchema = new mongoose.Schema({
      question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
      type: { type: String, required: true },
      value: { type: String, required: true },
    }, { _id: false });

    const NUSNETIDAnswerModel = mongoose.model('NUSNET ID', NUSNETIDAnswerSchema);

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
