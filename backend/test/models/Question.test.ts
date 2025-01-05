import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import QuestionModel from '../../models/Question';
import {
  NUSNETIDQuestionModel,
  NUSNETEmailQuestionModel,
  TeamMemberSelectionQuestionModel,
  MultipleChoiceQuestionModel,
  MultipleResponseQuestionModel,
  ScaleQuestionModel,
  ShortResponseQuestionModel,
  LongResponseQuestionModel,
  DateQuestionModel,
  NumberQuestionModel,
  UndecidedQuestionModel,
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

describe('Question Types Model Tests', () => {
  /*----------------------------------------NUSNETIDQuestion----------------------------------------*/
  describe('NUSNETIDQuestion', () => {
    it('should create and save a valid NUSNETIDQuestion', async () => {
      const question = new NUSNETIDQuestionModel({
        text: 'Enter your NUSNET ID',
        type: 'NUSNET ID',
        shortResponsePlaceholder: 'E1234567',
        customInstruction: 'Include leading E followed by 7 digits',
        isRequired: true,
        isLocked: true,
        order: 1,
      });

      const savedQuestion = await question.save();
      expect(savedQuestion._id).toBeDefined();
      expect(savedQuestion.shortResponsePlaceholder).toBe('E1234567');
    });

    it('should fail if shortResponsePlaceholder is missing', async () => {
      const question = new NUSNETIDQuestionModel({
        text: 'Enter your NUSNET ID',
        type: 'NUSNET ID',
        // shortResponsePlaceholder missing
        isRequired: true,
        isLocked: true,
        order: 1,
      });

      await expect(question.save()).rejects.toThrow(
        /shortResponsePlaceholder.*required/
      );
    });
  });

  /*----------------------------------------NUSNETEmailQuestion----------------------------------------*/
  describe('NUSNETEmailQuestion', () => {
    it('should create and save a valid NUSNETEmailQuestion', async () => {
      const question = new NUSNETEmailQuestionModel({
        text: 'Enter your NUSNET Email',
        type: 'NUSNET Email',
        shortResponsePlaceholder: 'example@nus.edu.sg',
        isRequired: true,
        isLocked: false,
        order: 2,
      });

      const savedQuestion = await question.save();
      expect(savedQuestion._id).toBeDefined();
      expect(savedQuestion.shortResponsePlaceholder).toBe('example@nus.edu.sg');
    });

    it('should fail if shortResponsePlaceholder is missing', async () => {
      const question = new NUSNETEmailQuestionModel({
        text: 'Enter your NUSNET Email',
        type: 'NUSNET Email',
        // shortResponsePlaceholder missing
        isRequired: true,
        isLocked: false,
        order: 2,
      });

      await expect(question.save()).rejects.toThrow(
        /shortResponsePlaceholder.*required/
      );
    });
  });

  /*----------------------------------------TeamMemberSelectionQuestion----------------------------------------*/
  describe('TeamMemberSelectionQuestion', () => {
    it('should create and save a valid TeamMemberSelectionQuestion', async () => {
      const question = new TeamMemberSelectionQuestionModel({
        text: 'Select team members',
        type: 'Team Member Selection',
        isRequired: true,
        isLocked: true,
        order: 3,
      });

      const savedQuestion = await question.save();
      expect(savedQuestion._id).toBeDefined();
      expect(savedQuestion.type).toBe('Team Member Selection');
    });

    it('should fail if required fields are missing', async () => {
      const question = new TeamMemberSelectionQuestionModel({
        // No text, type, isRequired, isLocked, order
      });

      await expect(question.save()).rejects.toThrow();
    });
  });

  /*----------------------------------------MultipleChoiceQuestion----------------------------------------*/
  describe('MultipleChoiceQuestion', () => {
    it('should create and save a valid MultipleChoiceQuestion', async () => {
      const question = new MultipleChoiceQuestionModel({
        text: 'Choose an option',
        type: 'Multiple Choice',
        options: [
          { text: 'Option A', points: 1 },
          { text: 'Option B', points: 2 },
        ],
        isScored: true,
        isRequired: false,
        isLocked: false,
        order: 4,
      });

      const savedQuestion = await question.save();
      expect(savedQuestion._id).toBeDefined();
      expect(savedQuestion.options).toHaveLength(2);
    });
  });

  /*----------------------------------------MultipleResponseQuestion----------------------------------------*/
  describe('MultipleResponseQuestion', () => {
    it('should create and save a MultipleResponseQuestion', async () => {
      const question = new MultipleResponseQuestionModel({
        text: 'Select all that apply',
        type: 'Multiple Response',
        options: [
          { text: 'Option 1', points: 1 },
          { text: 'Option 2', points: -2 }, // negative allowed
        ],
        isScored: true,
        allowNegative: true,
        areWrongAnswersPenalized: false,
        allowPartialMarks: true,
        isRequired: true,
        isLocked: false,
        order: 5,
      });

      const savedQuestion = await question.save();
      expect(savedQuestion._id).toBeDefined();
      expect(savedQuestion.options).toHaveLength(2);
    });
  });

  /*----------------------------------------ScaleQuestion----------------------------------------*/
  describe('ScaleQuestion', () => {
    it('should create and save a valid ScaleQuestion', async () => {
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
        order: 6,
      });

      const savedQuestion = await question.save();
      expect(savedQuestion._id).toBeDefined();
      expect(savedQuestion.labels).toHaveLength(2);
    });

    it('should fail if there are fewer than 2 labels', async () => {
      const question = new ScaleQuestionModel({
        text: 'Invalid scale question',
        type: 'Scale',
        scaleMax: 5,
        labels: [
          { value: 1, label: 'OnlyOne', points: 1 },
          // Only one label => fail
        ],
        isScored: true,
        isRequired: true,
        isLocked: false,
        order: 6,
      });

      await expect(question.save()).rejects.toThrow(/at least two labels/);
    });

    it('should fail validation if ScaleQuestion has duplicate label values/points', async () => {
      const question = new ScaleQuestionModel({
        text: 'Rate something',
        type: 'Scale',
        scaleMax: 5,
        labels: [
          { value: 1, label: 'One', points: 1 },
          { value: 1, label: 'Duplicate Value', points: 2 },
        ],
        isScored: true,
        isRequired: true,
        isLocked: false,
        order: 3,
      });

      await expect(question.save()).rejects.toThrow(
        /Labels must have unique scale values, ascending point values, and at least two labels \(min and max\)\./
      );
    });

    it('should fail validation if ScaleQuestion has non-ascending or duplicate label values/points', async () => {
      const question = new ScaleQuestionModel({
        text: 'Rate something',
        type: 'Scale',
        scaleMax: 5,
        labels: [
          { value: 1, label: 'One', points: 2 },
          { value: 2, label: 'Three', points: 1 },
          // This one has lower points than previous => invalid
        ],
        isScored: true,
        isRequired: true,
        isLocked: false,
        order: 3,
      });

      await expect(question.save()).rejects.toThrow(
        /Labels must have unique scale values, ascending point values, and at least two labels \(min and max\)\./
      );
    });
  });

  /*----------------------------------------ShortResponseQuestion----------------------------------------*/
  describe('ShortResponseQuestion', () => {
    it('should create and save a ShortResponseQuestion', async () => {
      const question = new ShortResponseQuestionModel({
        text: 'Provide a short response',
        type: 'Short Response',
        shortResponsePlaceholder: 'Your answer',
        isRequired: false,
        isLocked: false,
        order: 7,
      });

      const savedQuestion = await question.save();
      expect(savedQuestion._id).toBeDefined();
      expect(savedQuestion.shortResponsePlaceholder).toBe('Your answer');
    });

    it('should fail if shortResponsePlaceholder is missing', async () => {
      const question = new ShortResponseQuestionModel({
        text: 'Provide a short response',
        type: 'Short Response',
        // shortResponsePlaceholder missing
        isRequired: false,
        isLocked: false,
        order: 7,
      });

      await expect(question.save()).rejects.toThrow(
        /shortResponsePlaceholder.*required/
      );
    });
  });

  /*----------------------------------------LongResponseQuestion----------------------------------------*/
  describe('LongResponseQuestion', () => {
    it('should create and save a LongResponseQuestion', async () => {
      const question = new LongResponseQuestionModel({
        text: 'Provide a detailed answer',
        type: 'Long Response',
        longResponsePlaceholder: 'Type your answer here',
        isRequired: true,
        isLocked: false,
        order: 8,
      });

      const savedQuestion = await question.save();
      expect(savedQuestion._id).toBeDefined();
      expect(savedQuestion.longResponsePlaceholder).toBe('Type your answer here');
    });

    it('should fail if longResponsePlaceholder is missing', async () => {
      const question = new LongResponseQuestionModel({
        text: 'Provide a detailed answer',
        type: 'Long Response',
        // longResponsePlaceholder missing
        isRequired: true,
        isLocked: false,
        order: 8,
      });

      await expect(question.save()).rejects.toThrow(
        /longResponsePlaceholder.*required/
      );
    });
  });

  /*----------------------------------------DateQuestion----------------------------------------*/
  describe('DateQuestion', () => {
    it('should create and save a DateQuestion', async () => {
      const question = new DateQuestionModel({
        text: 'Enter a date',
        type: 'Date',
        isRange: false,
        isRequired: false,
        isLocked: false,
        order: 9,
      });

      const savedQuestion = await question.save();
      expect(savedQuestion._id).toBeDefined();
      expect(savedQuestion.isRange).toBe(false);
    });

    it('should fail if isRange is missing', async () => {
      const question = new DateQuestionModel({
        text: 'Enter a date',
        type: 'Date',
        // isRange missing
        isRequired: false,
        isLocked: false,
        order: 9,
      });

      await expect(question.save()).rejects.toThrow(/Path `isRange` is required/);
    });
  });

  /*----------------------------------------NumberQuestion----------------------------------------*/
  describe('NumberQuestion', () => {
    it('should create and save a NumberQuestion with direct scoring', async () => {
      const question = new NumberQuestionModel({
        text: 'Enter a number from 1 to 10',
        type: 'Number',
        maxNumber: 10,
        isScored: true,
        scoringMethod: 'direct',
        maxPoints: 10,
        isRequired: true,
        isLocked: false,
        order: 10,
      });

      const savedQuestion = await question.save();
      expect(savedQuestion._id).toBeDefined();
      expect(savedQuestion.maxNumber).toBe(10);
      expect(savedQuestion.scoringMethod).toBe('direct');
    });

    it('should fail if maxNumber is missing', async () => {
      const question = new NumberQuestionModel({
        text: 'Enter a number from 1 to 10',
        type: 'Number',
        // maxNumber missing
        isScored: true,
        scoringMethod: 'direct',
        maxPoints: 10,
        isRequired: true,
        isLocked: false,
        order: 10,
      });

      await expect(question.save()).rejects.toThrow(/Path `maxNumber` is required/);
    });
  });

  /*----------------------------------------UndecidedQuestion----------------------------------------*/
  describe('UndecidedQuestion', () => {
    it('should create and save an UndecidedQuestion', async () => {
      const question = new UndecidedQuestionModel({
        text: 'This is an undecided question',
        type: 'Undecided',
        isRequired: false,
        isLocked: false,
        order: 11,
      });

      const savedQuestion = await question.save();
      expect(savedQuestion._id).toBeDefined();
      expect(savedQuestion.type).toBe('Undecided');
    });

    it('should fail if required fields are missing', async () => {
      const question = new UndecidedQuestionModel({
        // no text, type, isRequired, isLocked, order
      });

      await expect(question.save()).rejects.toThrow();
    });
  });

  /*----------------------------------------Generic----------------------------------------*/
  it('should fail validation when required fields are missing on generic QuestionModel', async () => {
    const question = new QuestionModel({});
    await expect(question.save()).rejects.toThrow();
  });
});
