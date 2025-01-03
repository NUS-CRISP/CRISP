// Note: This tests for both Question.ts and QuestionTypes.ts

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import QuestionModel from '../../models/Question';
import {
  NUSNETIDQuestionModel,
  MultipleChoiceQuestionModel,
  ScaleQuestionModel,
  NumberQuestionModel,
} from '../../models/QuestionTypes';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Question Model', () => {
  it('should create and save a NUSNETIDQuestion', async () => {
    const question = new NUSNETIDQuestionModel({
      text: 'Student NUSNET ID (EXXXXXXX)',
      type: 'NUSNET ID',
      shortResponsePlaceholder: 'E1234567',
      customInstruction:
        'Enter your NUSNET ID starting with E followed by 7 digits.',
      isLocked: true,
      isRequired: true,
      order: 2,
    });

    const savedQuestion = await question.save();

    expect(savedQuestion._id).toBeDefined();
    expect(savedQuestion.type).toBe('NUSNET ID');
    expect(savedQuestion.shortResponsePlaceholder).toBe('E1234567');
  });

  it('should create and save a MultipleChoiceQuestion', async () => {
    const question = new MultipleChoiceQuestionModel({
      text: 'Select your favorite color',
      type: 'Multiple Choice',
      options: [
        { text: 'Red', points: 1 },
        { text: 'Blue', points: 2 },
      ],
      isScored: true,
      isRequired: true,
      isLocked: false,
      order: 2,
    });

    const savedQuestion = await question.save();

    expect(savedQuestion._id).toBeDefined();
    expect(savedQuestion.type).toBe('Multiple Choice');
    expect(savedQuestion.options.length).toBe(2);
  });

  it('should create and save a ScaleQuestion', async () => {
    const question = new ScaleQuestionModel({
      text: 'Rate your experience',
      type: 'Scale',
      scaleMax: 5,
      labels: [
        { value: 1, label: 'Poor', points: 1 },
        { value: 5, label: 'Excellent', points: 5 },
      ],
      isScored: true,
      isRequired: true,
      isLocked: false,
      order: 2,
    });

    const savedQuestion = await question.save();

    expect(savedQuestion._id).toBeDefined();
    expect(savedQuestion.type).toBe('Scale');
    expect(savedQuestion.labels.length).toBe(2);
  });

  it('should create and save a NumberQuestion', async () => {
    const question = new NumberQuestionModel({
      text: 'Enter a number between 1 and 10',
      type: 'Number',
      maxNumber: 10,
      isScored: true,
      scoringMethod: 'direct',
      maxPoints: 10,
      isRequired: true,
      isLocked: false,
      order: 2,
    });

    const savedQuestion = await question.save();

    expect(savedQuestion._id).toBeDefined();
    expect(savedQuestion.type).toBe('Number');
    expect(savedQuestion.maxNumber).toBe(10);
  });

  it('should fail validation when required fields are missing', async () => {
    const question = new QuestionModel({});
    await expect(question.save()).rejects.toThrow();
  });
});
