/* eslint-disable @typescript-eslint/no-explicit-any */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import InternalAssessmentModel from '../../models/InternalAssessment';
import AccountModel from '../../models/Account';
import ResultModel from '../../models/Result';
import CourseModel from '../../models/Course';
import {
  getInternalAssessmentById,
  updateInternalAssessmentById,
  deleteInternalAssessmentById,
  uploadInternalAssessmentResultsById,
  updateInternalAssessmentResultMarkerById,
  addInternalAssessmentsToCourse,
  addQuestionToAssessment,
  getQuestionsByAssessmentId,
  updateQuestionById,
  releaseInternalAssessmentById,
  recallInternalAssessmentById,
} from '../../services/internalAssessmentService';
import { NotFoundError } from '../../services/errors';
import { MultipleChoiceQuestion } from '@models/QuestionTypes';

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
    email: 'faculty@example.com',
    password: 'password',
    role: 'Faculty member',
    user: new mongoose.Types.ObjectId(),
    isApproved: true,
  });
  await account.save();

  const course = await CourseModel.create({
    name: 'Introduction to Computer Science',
    code: 'CS101',
    semester: 'Fall 2024',
    startDate: new Date('2024-08-15'),
    courseType: 'Normal',
  });
  await course.save();
  const assessment = await InternalAssessmentModel.create({
    course: course._id,
    assessmentName: 'Test Assessment',
    description: 'A test assessment for unit tests.',
    granularity: 'team',
    isReleased: true,
    areSubmissionsEditable: true,
    startDate: new Date(),
  });

  const result = new ResultModel({
    assessment: assessment._id,
    marks: [{ user: new mongoose.Types.ObjectId(), name: 'Student 1', mark: 0 }],
  });
  await result.save();
  assessment.results.push(result._id);
  await assessment.save();

  return { course, account, assessment, result };
};

describe('internalAssessmentService', () => {
  let course: any;
  let account: any;
  let assessment: any;
  let result: any;

  beforeEach(async () => {
    ({ course, account, assessment, result } = await setupData());
  });

  describe('getInternalAssessmentById', () => {
    it('should retrieve an internal assessment by ID', async () => {
      const fetchedAssessment = await getInternalAssessmentById(
        assessment._id.toString(),
        account._id.toString()
      );
      expect(fetchedAssessment._id.toString()).toEqual(assessment._id.toString());
    });

    it('should throw NotFoundError if assessment not found', async () => {
      const invalidId = new mongoose.Types.ObjectId().toString();
      await expect(getInternalAssessmentById(invalidId, account._id.toString())).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateInternalAssessmentById', () => {
    it('should update an internal assessment', async () => {
      const updatedAssessment = await updateInternalAssessmentById(
        assessment._id.toString(),
        account._id.toString(),
        { assessmentName: 'Updated Exam' }
      );
      expect(updatedAssessment.assessmentName).toEqual('Updated Exam');
    });
  });

  describe('deleteInternalAssessmentById', () => {
    it('should delete an internal assessment by ID', async () => {
      await deleteInternalAssessmentById(assessment._id.toString());
      const deletedAssessment = await InternalAssessmentModel.findById(
        assessment._id
      );
      expect(deletedAssessment).toBeNull();
    });
  });

  describe('uploadInternalAssessmentResultsById', () => {
    it('should upload results for an assessment', async () => {
      const results = [{ studentId: result.marks[0].user, mark: 85 }];
      await uploadInternalAssessmentResultsById(assessment._id.toString(), results);
      const updatedResult = await ResultModel.findById(result._id);
      expect(updatedResult?.marks[0].mark).toEqual(85);
    });
  });

  describe('updateInternalAssessmentResultMarkerById', () => {
    it('should update the marker for a result', async () => {
      const markerId = new mongoose.Types.ObjectId().toString();
      await updateInternalAssessmentResultMarkerById(
        assessment._id.toString(),
        result._id.toString(),
        markerId
      );
      const updatedResult = await ResultModel.findById(result._id);
      expect(updatedResult?.marker?.toString()).toEqual(markerId);
    });
  });

  describe('addInternalAssessmentsToCourse', () => {
    it('should add internal assessments to a course', async () => {
      const assessmentsData = [{ assessmentName: 'Final Exam', description: 'Final assessment', granularity: 'team', startDate: new Date(), teamSetName: 'Team Set A', areSubmissionsEditable: true }];
      await addInternalAssessmentsToCourse(course._id.toString(), assessmentsData);
      const updatedCourse = await CourseModel.findById(course._id).populate('internalAssessments');
      expect(updatedCourse?.internalAssessments.length).toBeGreaterThan(0);
    });
  });

  describe('addQuestionToAssessment', () => {
    it('should add a question to an assessment', async () => {
      const questionData = { type: 'Multiple Choice', text: 'What is 2+2?', isScored: true, options: [{ text: '4', points: 1 }] } as MultipleChoiceQuestion;
      const question = await addQuestionToAssessment(
        assessment._id.toString(),
        questionData,
        account._id.toString()
      );
      expect(question).toBeDefined();
      const updatedAssessment = await InternalAssessmentModel.findById(
        assessment._id
      ).populate('questions');
      expect(updatedAssessment?.questions.length).toBeGreaterThan(0);
    });
  });

  describe('getQuestionsByAssessmentId', () => {
    it('should retrieve all questions for an assessment', async () => {
      const questions = await getQuestionsByAssessmentId(
        assessment._id.toString(),
        account._id.toString()
      );
      expect(questions).toBeInstanceOf(Array);
    });
  });

  describe('updateQuestionById', () => {
    it('should update a question by ID', async () => {
      const questionId = new mongoose.Types.ObjectId().toString();
      const updatedQuestion = await updateQuestionById(
        questionId,
        { text: 'Updated question text' },
        account._id.toString()
      );
      expect(updatedQuestion.text).toEqual('Updated question text');
    });
  });

  describe('releaseInternalAssessmentById', () => {
    it('should release an internal assessment by ID', async () => {
      const releasedAssessment = await releaseInternalAssessmentById(
        assessment._id.toString(),
        account._id.toString()
      );
      expect(releasedAssessment.isReleased).toBe(true);
    });
  });

  describe('recallInternalAssessmentById', () => {
    it('should recall a released internal assessment', async () => {
      await releaseInternalAssessmentById(assessment._id.toString(), account._id.toString());
      const recalledAssessment = await recallInternalAssessmentById(
        assessment._id.toString(),
        account._id.toString()
      );
      expect(recalledAssessment.isReleased).toBe(false);
    });
  });
});
