/* eslint-disable @typescript-eslint/no-explicit-any */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import InternalAssessmentModel from '../../models/InternalAssessment';
import AccountModel from '../../models/Account';
import CourseModel from '../../models/Course';
import {
  getInternalAssessmentById,
  updateInternalAssessmentById,
  deleteInternalAssessmentById,
  addInternalAssessmentsToCourse,
  addQuestionToAssessment,
  getQuestionsByAssessmentId,
  updateQuestionById,
  releaseInternalAssessmentById,
  recallInternalAssessmentById,
} from '../../services/internalAssessmentService';
import { NotFoundError } from '../../services/errors';
import { MultipleChoiceOption, MultipleChoiceQuestion, MultipleChoiceQuestionModel, TeamMemberSelectionQuestionModel } from '@models/QuestionTypes';
import { TeamMemberSelectionAnswerModel, MultipleChoiceAnswerModel } from '@models/Answer';
import AssessmentAssignmentSetModel, { AssignedUser } from '@models/AssessmentAssignmentSet';
import SubmissionModel from '@models/Submission';
import TeamModel from '@models/Team';
import TeamSetModel from '@models/TeamSet';
import UserModel from '@models/User';
import AssessmentResultModel from '@models/AssessmentResult';

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

  const student = await UserModel.create({
    identifier: 'studentUser',
    name: 'Test Student',
  });

  const ta = await UserModel.create({
    identifier: 'taUser',
    name: 'Test TA',
  });
  const team = new TeamModel({
    number: 1,
    members: [student],
    TA: ta,
  });
  await team.save();

  const teamSet = new TeamSetModel({
    name: 'Team Set 1',
    course: course._id,
    teams: [team],
  });
  await teamSet.save();

  const teamMemberQuestion = new TeamMemberSelectionQuestionModel({
    text: 'Select students',
    type: 'Team Member Selection',
    isRequired: true,
    isLocked: true,
  });
  await teamMemberQuestion.save();
  const teamMemberAnswer = new TeamMemberSelectionAnswerModel({
    question: teamMemberQuestion._id,
    type: 'Team Member Selection Answer',
    selectedUserIds: [student._id],
  })
  await teamMemberAnswer.save();

  const mcQuestion = new MultipleChoiceQuestionModel({
    text: '星街すいせいは。。。',
    type: 'Multiple Choice',
    isRequired: true,
    isLocked: false,
    isScored: true,
    options: [{
      text: '今日もかわいい',
      points: 10,
    }, {
      text: '今日も怖い',
      points: 5,
    }] as MultipleChoiceOption[]
  });
  await mcQuestion.save();
  const mcAnswer = new MultipleChoiceAnswerModel({
    question: mcQuestion._id,
    type: 'Multiple Choice Answer',
    value: '今日も怖い'
  });
  await mcAnswer.save();

  const startDate = new Date();
  startDate.setUTCFullYear(new Date().getUTCFullYear() - 1);
  const assessment = new InternalAssessmentModel({
    course: course._id,
    assessmentName: 'Midterm Exam',
    description: 'Midterm assessment',
    startDate: startDate,
    maxMarks: 10,
    granularity: 'team',
    teamSet: teamSet._id,
    areSubmissionsEditable: true,
    results: [],
    isReleased: false,
    questions: [teamMemberQuestion, mcQuestion],
  });
  await assessment.save();
  const assignmentSet = await AssessmentAssignmentSetModel.create({
    assessment: assessment._id,
    assignedUsers: [{ user: student._id, tas: [ta._id] } as AssignedUser],
  });
  await assignmentSet.save();
  assessment.assessmentAssignmentSet = assignmentSet._id;
  await assessment.save();
  const submission = new SubmissionModel({
    assessment: assessment._id,
    user: ta._id,
    answers: [
      teamMemberAnswer, mcAnswer,
    ],
    isDraft: false,
    submittedAt: new Date(),
    score: 5,
  });
  await submission.save();
  const result = new AssessmentResultModel({
    assessment: assessment._id,
    student: student._id,
    marker: ta._id,
    marks: {
      marker: student._id,
      submission: submission._id,
      score: 5,
    },
    averageScore: 5,
  })
  await result.save();

  return { course, account, teamSet, teamMemberQuestion, teamMemberAnswer, mcQuestion, mcAnswer, ta, student, assessment, result };
};

describe('internalAssessmentService', () => {
  let course: any;
  let account: any;
  let teamSet: any;
  let assessment: any;
  // let result: any;
  // let teamMemberQuestion: any;
  // let teamMemberAnswer: any;
  let mcQuestion: any;
  // let mcAnswer: any;
  // let ta: any;
  // let student: any;

  beforeEach(async () => {
    ({ course, account, teamSet, mcQuestion, assessment } = await setupData());
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

  describe('addInternalAssessmentsToCourse', () => {
    it('should add internal assessments to a course', async () => {
      const startDate = new Date();
      startDate.setUTCFullYear(new Date().getUTCFullYear() - 1);
      const assessmentsData = [{
        assessmentName: 'Final Exam',
        description: 'Final assessment',
        startDate: startDate,
        maxMarks: 10,
        granularity: 'individual',
        teamSetName: teamSet.name,
        areSubmissionsEditable: true,
      }];
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
      const questionId = mcQuestion._id;
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
