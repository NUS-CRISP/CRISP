import mongoose, { ConnectOptions } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MultipleChoiceAnswerModel, NUSNETIDAnswerModel } from '../../models/Answer';
import { MultipleChoiceQuestionModel, NUSNETIDQuestionModel } from '@models/QuestionTypes';
let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as ConnectOptions);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Answer Model', () => {
  it('should create and save a NUSNETIDAnswer', async () => {
    const question = new NUSNETIDQuestionModel({
      text: 'Student NUSNET ID (EXXXXXXX)',
      shortResponsePlaceholder: 'E1234567',
      customInstruction: 'Enter your NUSNET ID starting with E followed by 7 digits.',
      isLocked: true,
      isRequired: true,
    });

    const answer = new NUSNETIDAnswerModel({
      question: question._id,
      value: 'E1234567',
    });

    const savedAnswer = await answer.save();

    expect(savedAnswer._id).toBeDefined();
    expect(savedAnswer.type).toBe('NUSNET ID Answer');
  });

  it('should create and save a MultipleChoiceAnswer', async () => {
    const question = new MultipleChoiceQuestionModel({
      text: 'Choose your favorite color',
      isRequired: true,
      isScored: false,
    });
    await question.save();

    const answer = new MultipleChoiceAnswerModel({
      question: question._id,
      value: 'Blue',
    });

    const savedAnswer = await answer.save();

    expect(savedAnswer._id).toBeDefined();
    expect(savedAnswer.type).toBe('Multiple Choice Answer');
  });

  it('should fail validation when required fields are missing', async () => {
    const invalidAnswer = new MultipleChoiceAnswerModel({
      // Missing required fields
    });

    await expect(invalidAnswer.save()).rejects.toThrow();
  });
});
