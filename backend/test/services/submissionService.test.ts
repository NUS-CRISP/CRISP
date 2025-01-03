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
import {
  MultipleChoiceAnswer,
  TeamMemberSelectionAnswer,
} from '@models/Answer';
import CourseModel from '@models/Course';
import TeamSetModel from '@models/TeamSet';
import {
  MultipleChoiceOption,
  MultipleChoiceQuestionModel,
  TeamMemberSelectionQuestionModel,
} from '@models/QuestionTypes';
import AssessmentAssignmentSetModel, {
  AssignedUser,
} from '@models/AssessmentAssignmentSet';
import TeamModel from '@models/Team';
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
    order: 1,
  });
  await teamMemberQuestion.save();

  const mcQuestion = new MultipleChoiceQuestionModel({
    text: '星街すいせいは。。。',
    type: 'Multiple Choice',
    isRequired: true,
    isLocked: false,
    isScored: true,
    options: [
      {
        text: '今日もかわいい',
        points: 10,
      },
      {
        text: '今日も怖い',
        points: 5,
      },
    ] as MultipleChoiceOption[],
    order: 2,
  });
  await mcQuestion.save();

  const startDate = new Date();
  startDate.setUTCFullYear(new Date().getUTCFullYear() - 1);
  const assessment = new InternalAssessmentModel({
    course: course._id,
    assessmentName: 'Midterm Exam',
    description: 'Midterm assessment',
    startDate: startDate,
    maxMarks: 10,
    scaleToMaxMarks: true,
    granularity: 'individual',
    teamSet: teamSet._id,
    areSubmissionsEditable: true,
    results: [],
    isReleased: true,
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

  return { account, student, ta, assessment, teamMemberQuestion, mcQuestion };
};

describe('submissionService', () => {
  let account: any;
  let student: any;
  let ta: any;
  let assessment: any;
  let teamMemberQuestion: any;
  let mcQuestion: any;

  beforeEach(async () => {
    ({ account, student, ta, assessment, teamMemberQuestion, mcQuestion } =
      await setupData());
  });

  describe('createSubmission', () => {
    it('should create a new submission', async () => {
      const teamMemberAnswer = {
        question: teamMemberQuestion._id,
        type: 'Team Member Selection Answer',
        selectedUserIds: [student._id],
      } as TeamMemberSelectionAnswer;
      const mcAnswer = {
        question: mcQuestion._id,
        type: 'Multiple Choice Answer',
        value: '今日も怖い',
      } as MultipleChoiceAnswer;
      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        [teamMemberAnswer, mcAnswer],
        false
      );

      expect(submission).toBeDefined();
      expect(submission.user.toString()).toEqual(ta._id.toString());
    });

    it('should throw NotFoundError if user not found', async () => {
      const invalidUserId = new mongoose.Types.ObjectId().toString();
      const teamMemberAnswer = {
        question: teamMemberQuestion._id,
        type: 'Team Member Selection Answer',
        selectedUserIds: [student._id],
      } as TeamMemberSelectionAnswer;
      const mcAnswer = {
        question: mcQuestion._id,
        type: 'Multiple Choice Answer',
        value: '今日も怖い',
      } as MultipleChoiceAnswer;
      await expect(
        createSubmission(
          assessment._id.toString(),
          invalidUserId,
          [teamMemberAnswer, mcAnswer],
          false
        )
      ).rejects.toThrow();
    });
  });

  describe('updateSubmission', () => {
    it('should update a submission', async () => {
      const teamMemberAnswer = {
        question: teamMemberQuestion._id,
        type: 'Team Member Selection Answer',
        selectedUserIds: [student._id],
      } as TeamMemberSelectionAnswer;
      const mcAnswer = {
        question: mcQuestion._id,
        type: 'Multiple Choice Answer',
        value: '今日も怖い',
      } as MultipleChoiceAnswer;
      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        [teamMemberAnswer, mcAnswer],
        true
      );
      const result = await AssessmentResultModel.findOne({
        student: student._id,
        assessment: assessment._id,
      });
      expect(result).toBeDefined();

      const updatedSubmission = await updateSubmission(
        submission._id.toString(),
        ta._id.toString(),
        account._id.toString(),
        [teamMemberAnswer, mcAnswer],
        false
      );

      expect(updatedSubmission.isDraft).toBe(false);
    });

    it('should throw NotFoundError if submission not found', async () => {
      const invalidSubmissionId = new mongoose.Types.ObjectId().toString();
      const teamMemberAnswer = {
        question: teamMemberQuestion._id,
        type: 'Team Member Selection Answer',
        selectedUserIds: [student._id],
      } as TeamMemberSelectionAnswer;
      const mcAnswer = {
        question: mcQuestion._id,
        type: 'Multiple Choice Answer',
        value: '今日も怖い',
      } as MultipleChoiceAnswer;
      await expect(
        updateSubmission(
          invalidSubmissionId,
          ta._id.toString(),
          account._id.toString(),
          [teamMemberAnswer, mcAnswer],
          false
        )
      ).rejects.toThrow();
    });
  });

  describe('deleteSubmission', () => {
    it('should delete a submission by ID', async () => {
      const teamMemberAnswer = {
        question: teamMemberQuestion._id,
        type: 'Team Member Selection Answer',
        selectedUserIds: [student._id],
      } as TeamMemberSelectionAnswer;
      const mcAnswer = {
        question: mcQuestion._id,
        type: 'Multiple Choice Answer',
        value: '今日も怖い',
      } as MultipleChoiceAnswer;
      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        [teamMemberAnswer, mcAnswer],
        false
      );

      await deleteSubmission(ta._id.toString(), submission._id.toString());
      const deletedSubmission = await SubmissionModel.findById(submission._id);
      expect(deletedSubmission).toBeDefined();
      expect(deletedSubmission!.deleted).toBe(true);
    });

    it('should throw NotFoundError for invalid submission ID', async () => {
      const invalidSubmissionId = new mongoose.Types.ObjectId().toString();
      await expect(
        deleteSubmission(ta._id, invalidSubmissionId)
      ).rejects.toThrow();
    });
  });

  describe('getSubmissionsByAssessmentAndUser', () => {
    it('should retrieve submissions by assessment and user', async () => {
      const teamMemberAnswer = {
        question: teamMemberQuestion._id,
        type: 'Team Member Selection Answer',
        selectedUserIds: [student._id],
      } as TeamMemberSelectionAnswer;
      const mcAnswer = {
        question: mcQuestion._id,
        type: 'Multiple Choice Answer',
        value: '今日も怖い',
      } as MultipleChoiceAnswer;
      await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        [teamMemberAnswer, mcAnswer],
        false
      );
      const submissions = await getSubmissionsByAssessmentAndUser(
        assessment._id.toString(),
        ta._id.toString()
      );
      expect(submissions.length).toBeGreaterThan(0);
    });
  });

  describe('getSubmissionsByAssessment', () => {
    it('should retrieve submissions by assessment', async () => {
      const teamMemberAnswer = {
        question: teamMemberQuestion._id,
        type: 'Team Member Selection Answer',
        selectedUserIds: [student._id],
      } as TeamMemberSelectionAnswer;
      const mcAnswer = {
        question: mcQuestion._id,
        type: 'Multiple Choice Answer',
        value: '今日も怖い',
      } as MultipleChoiceAnswer;
      await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        [teamMemberAnswer, mcAnswer],
        false
      );
      const submissions = await getSubmissionsByAssessment(
        assessment._id.toString()
      );
      expect(submissions.length).toBeGreaterThan(0);
    });
  });

  describe('adjustSubmissionScore', () => {
    it('should adjust the score of a submission', async () => {
      const teamMemberAnswer = {
        question: teamMemberQuestion._id,
        type: 'Team Member Selection Answer',
        selectedUserIds: [student._id],
      } as TeamMemberSelectionAnswer;
      const mcAnswer = {
        question: mcQuestion._id,
        type: 'Multiple Choice Answer',
        value: '今日も怖い',
      } as MultipleChoiceAnswer;
      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        [teamMemberAnswer, mcAnswer],
        false
      );

      const adjustedSubmission = await adjustSubmissionScore(
        submission._id.toString(),
        85
      );
      expect(adjustedSubmission.adjustedScore).toBe(85);
    });

    it('should throw error for negative score adjustment', async () => {
      const teamMemberAnswer = {
        question: teamMemberQuestion._id,
        type: 'Team Member Selection Answer',
        selectedUserIds: [student._id],
      } as TeamMemberSelectionAnswer;
      const mcAnswer = {
        question: mcQuestion._id,
        type: 'Multiple Choice Answer',
        value: '今日も怖い',
      } as MultipleChoiceAnswer;
      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        [teamMemberAnswer, mcAnswer],
        false
      );

      await expect(
        adjustSubmissionScore(submission._id.toString(), -5)
      ).rejects.toThrow();
    });
  });
});
