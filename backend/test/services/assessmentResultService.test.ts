// tests/services/assessmentResultService.test.ts

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import AssessmentAssignmentSetModel from '../../models/AssessmentAssignmentSet';
import AssessmentResultModel from '../../models/AssessmentResult';
import InternalAssessmentModel from '../../models/InternalAssessment';
import UserModel from '../../models/User';
import {
  getOrCreateAssessmentResults,
  recalculateResult,
  checkMarkingCompletion,
} from '../../services/assessmentResultService';
import { BadRequestError, NotFoundError } from '../../services/errors';

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
  if (mongo) await mongo.stop();
  await mongoose.connection.close();
});

describe('assessmentResultService', () => {
  let assessmentId: mongoose.Types.ObjectId;
  let studentId: mongoose.Types.ObjectId;
  let taId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    // Setup test data
    const assessment = await InternalAssessmentModel.create({
      assessmentName: 'Sample Assessment',
      description: 'A sample assessment',
      granularity: 'individual',
    });
    assessmentId = assessment._id;

    const student = await UserModel.create({
      identifier: 'studentUser',
      name: 'Test Student',
    });
    studentId = student._id;

    const ta = await UserModel.create({
      identifier: 'taUser',
      name: 'Test TA',
    });
    taId = ta._id;

    const assignmentSet = await AssessmentAssignmentSetModel.create({
      assessment: assessmentId,
      assignedUsers: [{ user: studentId, tas: [taId] }],
    });
    assessment.assessmentAssignmentSet = assignmentSet._id;
    await assessment.save();
  });

  describe('getOrCreateAssessmentResults', () => {
    it('should create assessment results for assigned students', async () => {
      const results = await getOrCreateAssessmentResults(assessmentId.toString());

      expect(results).toHaveLength(1);
      expect(results[0].student.toString()).toEqual(studentId.toString());
    });

    it('should retrieve existing assessment results if they already exist', async () => {
      await getOrCreateAssessmentResults(assessmentId.toString());

      const results = await getOrCreateAssessmentResults(assessmentId.toString());

      expect(results).toHaveLength(1);
    });

    it('should throw NotFoundError if assessment assignment set is not found', async () => {
      const invalidId = new mongoose.Types.ObjectId().toString();
      await expect(getOrCreateAssessmentResults(invalidId)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('recalculateResult', () => {
    it('should recalculate the average score for a result', async () => {
      const result = await AssessmentResultModel.create({
        assessment: assessmentId,
        student: studentId,
        marks: [{ marker: taId, score: 80 }],
      });

      await recalculateResult(result._id.toString());

      const updatedResult = await AssessmentResultModel.findById(result._id);
      expect(updatedResult?.averageScore).toEqual(80);
    });

    it('should throw NotFoundError if the result is not found', async () => {
      const invalidId = new mongoose.Types.ObjectId().toString();
      await expect(recalculateResult(invalidId)).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError if there are no marks to recalculate', async () => {
      const result = await AssessmentResultModel.create({
        assessment: assessmentId,
        student: studentId,
        marks: [],
      });

      await expect(recalculateResult(result._id.toString())).rejects.toThrow(
        BadRequestError
      );
    });
  });

  describe('checkMarkingCompletion', () => {
    it('should return unmarked teams or users for an assessment', async () => {
      await getOrCreateAssessmentResults(assessmentId.toString());

      const unmarkedTeams = await checkMarkingCompletion(assessmentId.toString());

      expect(unmarkedTeams).toHaveLength(1);
      expect(unmarkedTeams[0].student!.toString()).toEqual(studentId.toString());
    });

    it('should throw NotFoundError if the assessment is not found', async () => {
      const invalidId = new mongoose.Types.ObjectId().toString();
      await expect(checkMarkingCompletion(invalidId)).rejects.toThrow(
        NotFoundError
      );
    });
  });
});
