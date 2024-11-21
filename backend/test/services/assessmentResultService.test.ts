import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import AssessmentAssignmentSetModel, { AssignedUser } from '../../models/AssessmentAssignmentSet';
import AssessmentResultModel from '../../models/AssessmentResult';
import InternalAssessmentModel from '../../models/InternalAssessment';
import UserModel from '../../models/User';
import {
  getOrCreateAssessmentResults,
  recalculateResult,
} from '../../services/assessmentResultService';
import { BadRequestError, NotFoundError } from '../../services/errors';
import CourseModel from '@models/Course';
import TeamModel from '@models/Team';
import TeamSetModel from '@models/TeamSet';
import SubmissionModel from '@models/Submission';
import { MultipleChoiceOption, MultipleChoiceQuestionModel, TeamMemberSelectionQuestionModel } from '@models/QuestionTypes';
import { MultipleChoiceAnswerModel, TeamMemberSelectionAnswerModel } from '@models/Answer';

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
  let teamMemberQuestionId: mongoose.Types.ObjectId;
  let mcQuestionId: mongoose.Types.ObjectId;
  let submissionId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    // Setup test data
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
    studentId = student._id;

    const ta = await UserModel.create({
      identifier: 'taUser',
      name: 'Test TA',
    });
    taId = ta._id;
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
    teamMemberQuestionId = teamMemberQuestion._id;
    const teamMemberAnswer = new TeamMemberSelectionAnswerModel({
      question: teamMemberQuestionId,
      type: 'Team Member Selection Answer',
      selectedUserIds: [studentId],
    })
    await teamMemberAnswer.save();

    const mcQuestion = new MultipleChoiceQuestionModel({
      text: '星街すいせいは。。。',
      type: 'Multiple Choice',
      isRequired: true,
      isLocked: false,
      isScored: true,
      options: [{
        text: '今日もかわいいね',
        points: 10,
      }, {
        text: '今日も怖い',
        points: 5,
      }] as MultipleChoiceOption[]
    });
    await mcQuestion.save();
    mcQuestionId = mcQuestion._id;
    const mcAnswer = new MultipleChoiceAnswerModel({
      question: mcQuestionId,
      type: 'Multiple Choice Answer',
      value: '今日も怖い'
    });
    await mcAnswer.save();

    const assessment = new InternalAssessmentModel({
      course: course._id,
      assessmentName: 'Midterm Exam',
      description: 'Midterm assessment',
      startDate: new Date().setUTCFullYear(new Date().getUTCFullYear() - 1),
      maxMarks: 10,
      granularity: 'team',
      teamSet: teamSet._id,
      areSubmissionsEditable: true,
      results: [],
      isReleased: false,
      questions: [teamMemberQuestion, mcQuestion],
    });
    await assessment.save();
    assessmentId = assessment._id;
    await assessment.save();
    const assignmentSet = await AssessmentAssignmentSetModel.create({
      assessment: assessment._id,
      assignedUsers: [{ user: studentId, tas: [taId] } as AssignedUser],
    });
    await assignmentSet.save();
    assessment.assessmentAssignmentSet = assignmentSet._id;
    await assessment.save();
    const submission = new SubmissionModel({
      assessment: assessmentId,
      user: taId,
      answers: [
        teamMemberAnswer, mcAnswer,
      ],
      isDrafr: false,
      submittedAt: new Date(),
      score: 10, //Incorrect score for testing recalculate score
    });
    await submission.save();
    submissionId = submission._id;
  });

  describe('getOrCreateAssessmentResults', () => {
    it('should create assessment results for assigned students', async () => {
      const results = await getOrCreateAssessmentResults(assessmentId.toString());

      expect(results).toHaveLength(1);
      expect(results[0].student._id.toString()).toEqual(studentId.toString());
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
  /**
   * Disambiguation: This method is for updating a submission after a new result object is created.
   * It can be used to reset the scores if they are inaccurate, but this is not the main purpose of the function.
   * So, it is expected that the scores in the AssessmentResults are accurate, even if the submission's score may
   * not be accurate.
   */
  describe('recalculateResult', () => {
    it('should recalculate the average score for a result', async () => {
      const result = await AssessmentResultModel.create({
        assessment: assessmentId,
        student: studentId,
        marks: [{ marker: taId, submission: submissionId, score: 5 }], // The score here should be the correct one
      });

      await recalculateResult(result._id.toString());

      const updatedResult = await AssessmentResultModel.findById(result._id);
      expect(updatedResult?.averageScore).toEqual(5);
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
});
