import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import AnswerSchema from '../../models/Answer';
import QuestionModel from '../../models/Question';
let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Answer Model', () => {
  it('should create and save a NUSNETIDAnswer', async () => {
    const question = new QuestionModel({
      text: 'Enter your NUSNET ID',
      type: 'NUSNET ID',
      isRequired: true,
    });
    await question.save();

    const NUSNETIDAnswerModel = mongoose.model('NUSNET ID', AnswerSchema);

    const answer = new NUSNETIDAnswerModel({
      question: question._id,
      type: 'NUSNET ID',
      value: 'E1234567',
    });

    const savedAnswer = await answer.save();

    expect(savedAnswer._id).toBeDefined();
    expect(savedAnswer.type).toBe('NUSNET ID');
  });

  it('should create and save a MultipleChoiceAnswer', async () => {
    const question = new QuestionModel({
      text: 'Choose your favorite color',
      type: 'Multiple Choice',
      isRequired: true,
    });
    await question.save();

    const MultipleChoiceAnswerModel = mongoose.model('Multiple Choice', AnswerSchema);

    const answer = new MultipleChoiceAnswerModel({
      question: question._id,
      type: 'Multiple Choice',
      value: 'Blue',
    });

    const savedAnswer = await answer.save();

    expect(savedAnswer._id).toBeDefined();
    expect(savedAnswer.type).toBe('Multiple Choice');
  });

  it('should fail validation when required fields are missing', async () => {
    const InvalidAnswerModel = mongoose.model('Short Response', AnswerSchema);

    const invalidAnswer = new InvalidAnswerModel({
      // Missing required fields
    });

    await expect(invalidAnswer.save()).rejects.toThrow();
  });
});
