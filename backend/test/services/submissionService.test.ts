/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import SubmissionModel from '../../models/Submission';
import InternalAssessmentModel from '../../models/InternalAssessment';
import AccountModel from '../../models/Account';
import UserModel from '../../models/User';
import {
  createSubmission,
  updateSubmission,
  deleteSubmission,
  getSubmissionsByAssessmentAndUser,
  getSubmissionsByAssessment,
  adjustSubmissionScore,
} from '../../services/submissionService';
import { BadRequestError, NotFoundError } from '../../services/errors';
import { ShortResponseAnswer } from '@models/Answer';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const mongoUri = await mongo.getUri();
  await mongoose.connect(mongoUri);
});

beforeEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  if (mongo) {
    await mongo.stop();
  }
  await mongoose.connection.close();
});

const setupData = async () => {
  const account = new AccountModel({
    email: 'testuser@example.com',
    password: 'password',
    role: 'Student',
    user: new mongoose.Types.ObjectId(),
    isApproved: true,
  });
  await account.save();

  const user = new UserModel({
    identifier: 'testuser',
    name: 'Test User',
  });
  await user.save();

  const assessment = new InternalAssessmentModel({
    assessmentName: 'Final Exam',
    questions: [],
    granularity: 'individual',
  });
  await assessment.save();

  return { account, user, assessment };
};

describe('submissionService', () => {
  let account: any;
  let user: any;
  let assessment: any;

  beforeEach(async () => {
    ({ account, user, assessment } = await setupData());
  });

  describe('createSubmission', () => {
    it('should create a new submission', async () => {
      const answers = [{ question: new mongoose.Types.ObjectId(), type: 'Short Response', value: 'Answer' } as ShortResponseAnswer];
      const submission = await createSubmission(
        assessment._id.toString(),
        user._id.toString(),
        answers,
        false
      );

      expect(submission).toBeDefined();
      expect(submission.user.toString()).toEqual(user._id.toString());
    });

    it('should throw NotFoundError if user not found', async () => {
      const invalidUserId = new mongoose.Types.ObjectId().toString();
      await expect(
        createSubmission(assessment._id.toString(), invalidUserId, [], false)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateSubmission', () => {
    it('should update a submission', async () => {
      const answers = [{ question: new mongoose.Types.ObjectId(), type: 'Short Response', value: 'Answer' } as ShortResponseAnswer];
      const submission = await createSubmission(
        assessment._id.toString(),
        user._id.toString(),
        answers,
        false
      );

      const updatedSubmission = await updateSubmission(
        submission._id.toString(),
        user._id.toString(),
        account._id.toString(),
        answers,
        true
      );

      expect(updatedSubmission.isDraft).toBe(true);
    });

    it('should throw NotFoundError if submission not found', async () => {
      const invalidSubmissionId = new mongoose.Types.ObjectId().toString();
      await expect(
        updateSubmission(invalidSubmissionId, user._id.toString(), account._id.toString(), [], false)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteSubmission', () => {
    it('should delete a submission by ID', async () => {
      const submission = await createSubmission(
        assessment._id.toString(),
        user._id.toString(),
        [],
        false
      );

      await deleteSubmission(submission._id.toString());
      const deletedSubmission = await SubmissionModel.findById(submission._id);
      expect(deletedSubmission).toBeNull();
    });

    it('should throw NotFoundError for invalid submission ID', async () => {
      const invalidSubmissionId = new mongoose.Types.ObjectId().toString();
      await expect(deleteSubmission(invalidSubmissionId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getSubmissionsByAssessmentAndUser', () => {
    it('should retrieve submissions by assessment and user', async () => {
      await createSubmission(assessment._id.toString(), user._id.toString(), [], false);
      const submissions = await getSubmissionsByAssessmentAndUser(
        assessment._id.toString(),
        user._id.toString()
      );
      expect(submissions.length).toBeGreaterThan(0);
    });
  });

  describe('getSubmissionsByAssessment', () => {
    it('should retrieve submissions by assessment', async () => {
      await createSubmission(assessment._id.toString(), user._id.toString(), [], false);
      const submissions = await getSubmissionsByAssessment(assessment._id.toString());
      expect(submissions.length).toBeGreaterThan(0);
    });
  });

  describe('adjustSubmissionScore', () => {
    it('should adjust the score of a submission', async () => {
      const submission = await createSubmission(
        assessment._id.toString(),
        user._id.toString(),
        [],
        false
      );

      const adjustedSubmission = await adjustSubmissionScore(
        submission._id.toString(),
        85
      );
      expect(adjustedSubmission.adjustedScore).toBe(85);
    });

    it('should throw error for negative score adjustment', async () => {
      const submission = await createSubmission(
        assessment._id.toString(),
        user._id.toString(),
        [],
        false
      );

      await expect(
        adjustSubmissionScore(submission._id.toString(), -5)
      ).rejects.toThrow(BadRequestError);
    });
  });
});
