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
import { regradeSubmission } from '../../services/submissionService'; // <--- Import your regradeSubmission here
import {
  MultipleChoiceAnswer,
  TeamMemberSelectionAnswer,
  TeamMemberSelectionAnswerModel,
  MultipleResponseAnswerModel,
  ScaleAnswerModel,
  NumberAnswerModel,
  ShortResponseAnswerModel,
} from '@models/Answer';
import CourseModel from '@models/Course';
import TeamSetModel from '@models/TeamSet';
import {
  MultipleChoiceOption,
  MultipleChoiceQuestionModel,
  MultipleResponseQuestionModel,
  ScaleQuestionModel,
  NumberQuestionModel,
  DateQuestionModel,
  ShortResponseQuestionModel,
  TeamMemberSelectionQuestionModel,
} from '@models/QuestionTypes';
import AssessmentAssignmentSetModel, {
  AssignedUser,
} from '@models/AssessmentAssignmentSet';
import TeamModel from '@models/Team';
import AssessmentResultModel from '@models/AssessmentResult';

let mongo: MongoMemoryServer;

/**
 * We store global references here so we only call setupData() once.
 */
let account: any;
let student: any;
let ta: any;
let assessment: any;
let teamMemberQuestion: any;
let mcQuestion: any;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let shortQuestion: any;

beforeAll(async () => {
  // Spin up in-memory Mongo server
  mongo = await MongoMemoryServer.create();
  const mongoUri = mongo.getUri();
  await mongoose.connect(mongoUri);

  // Call setupData() exactly once
  const data = await setupData();
  account = data.account;
  student = data.student;
  ta = data.ta;
  assessment = data.assessment;
  teamMemberQuestion = data.teamMemberQuestion;
  mcQuestion = data.mcQuestion;
  shortQuestion = data.shortQuestion;
});

afterAll(async () => {
  if (mongo) {
    await mongo.stop();
  }
  await mongoose.connection.close();
});

/**
 * Instead of calling setupData in every test, we do a manual clearing if necessary.
 * But if you want to keep prior data, you can skip this.
 *
 * If you want to isolate tests so they don’t affect each other, you can
 * delete from relevant collections here. Then re-insert whatever test data
 * you need on each test manually (without calling setupData again).
 */
// beforeEach(async () => {
//   const collections = await mongoose.connection.db.collections();
//   for (const collection of collections) {
//     await collection.deleteMany({});
//   }
// });

/**
 * Single helper to initialize main data.
 * This is only called once at the top of the file to avoid duplicate key issues.
 */
const setupData = async (overrideEndDate?: Date) => {
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

  const shortQuestion = await ShortResponseQuestionModel.create({
    text: 'Short answer test question',
    type: 'Short Response',
    shortResponsePlaceholder: 'Enter your response here',
    isRequired: true,
    isLocked: false,
    isScored: true,
    order: 3,
  });

  const startDate = new Date();
  // Make the assessment window open for the test
  startDate.setUTCFullYear(new Date().getUTCFullYear() - 1);

  const assessment = new InternalAssessmentModel({
    course: course._id,
    assessmentName: 'Midterm Exam',
    description: 'Midterm assessment',
    startDate: startDate,
    endDate: overrideEndDate || null, // if we want a custom end date
    maxMarks: 10,
    scaleToMaxMarks: true,
    granularity: 'individual',
    teamSet: teamSet._id,
    areSubmissionsEditable: true,
    results: [],
    isReleased: true,
    questions: [teamMemberQuestion, mcQuestion, shortQuestion],
  });
  assessment.releaseNumber = 1;
  assessment.questionsTotalMarks = 10;
  await assessment.save();

  const assignmentSet = await AssessmentAssignmentSetModel.create({
    assessment: assessment._id,
    assignedUsers: [{ user: student._id, tas: [ta._id] } as AssignedUser],
  });
  await assignmentSet.save();

  assessment.assessmentAssignmentSet = assignmentSet._id;
  await assessment.save();

  return {
    account,
    student,
    ta,
    assessment,
    teamMemberQuestion,
    mcQuestion,
    shortQuestion,
  };
};

describe('submissionService', () => {
  //
  // NOTE: We now rely on the single call to setupData() in beforeAll.
  // Our test objects (assessment, student, etc.) are global references.
  //

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
      expect(submission.answers.length).toBe(2);
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
      ).rejects.toThrowError('Submission creator not found');
    });

    it('should throw an error if no Team Member Selection Answer is provided', async () => {
      // Omit the "Team Member Selection Answer"
      const mcAnswer = {
        question: mcQuestion._id,
        type: 'Multiple Choice Answer',
        value: '今日も怖い',
      } as MultipleChoiceAnswer;

      await expect(
        createSubmission(assessment._id.toString(), ta._id.toString(), [mcAnswer], false)
      ).rejects.toThrow();
    });

    it('should throw an error if question is not in assessment', async () => {
      // Create a new question but do not add to assessment
      const orphanQuestion = await MultipleChoiceQuestionModel.create({
        text: 'Orphan question',
        type: 'Multiple Choice',
        isRequired: true,
        isLocked: false,
        isScored: true,
        options: [
          {
            text: 'Test Option A',
            points: 2,
          },
        ],
        order: 99,
      });

      const orphanAnswer = {
        question: orphanQuestion._id,
        type: 'Multiple Choice Answer',
        value: 'Test Option A',
      } as MultipleChoiceAnswer;

      const teamMemberAnswer = {
        question: teamMemberQuestion._id,
        type: 'Team Member Selection Answer',
        selectedUserIds: [student._id],
      } as TeamMemberSelectionAnswer;

      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          [teamMemberAnswer, orphanAnswer],
          false
        )
      ).rejects.toThrowError(
        `Question ${orphanQuestion._id.toString()} not found in this assessment`
      );
    });

    it('should throw an error if question type mismatches answer type', async () => {
      const invalidAnswer = {
        question: mcQuestion._id,
        type: 'Team Member Selection Answer', // Wrong answer type for a Multiple Choice question
        selectedUserIds: [student._id],
      };

      const teamMemberAnswer = {
        question: teamMemberQuestion._id,
        type: 'Team Member Selection Answer',
        selectedUserIds: [student._id],
      } as TeamMemberSelectionAnswer;

      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          [teamMemberAnswer, invalidAnswer as any],
          false
        )
      ).rejects.toThrow(
        `Answer type "Team Member Selection Answer" does not match question type "Multiple Choice" for question ${mcQuestion._id.toString()}`
      );
    });

    it('should throw an error if outside submission period (start in future)', async () => {
      // Manually create an assessment with future start date
      const futureStart = new Date();
      futureStart.setFullYear(new Date().getFullYear() + 1);
      const futureAssessment = await InternalAssessmentModel.create({
        course: assessment.course,
        assessmentName: 'Future Assessment',
        description: 'Start Date in the future',
        startDate: futureStart,
        endDate: null,
        maxMarks: 10,
        scaleToMaxMarks: true,
        granularity: 'individual',
        teamSet: assessment.teamSet,
        areSubmissionsEditable: true,
        isReleased: true,
        questions: [teamMemberQuestion, mcQuestion],
      });

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
          futureAssessment._id.toString(),
          ta._id.toString(),
          [teamMemberAnswer, mcAnswer],
          false
        )
      ).rejects.toThrow('Assessment is not open for submissions at this time');
    });

    it('should throw an error if outside submission period (end date in the past)', async () => {
      // Manually create an assessment with past end date
      const now = new Date();
      const pastEnd = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
      const pastAssessment = await InternalAssessmentModel.create({
        course: assessment.course,
        assessmentName: 'Expired Assessment',
        description: 'End date in the past',
        startDate: new Date('2020-01-01'), // well in the past
        endDate: pastEnd,
        maxMarks: 10,
        scaleToMaxMarks: true,
        granularity: 'individual',
        teamSet: assessment.teamSet,
        areSubmissionsEditable: true,
        isReleased: true,
        questions: [teamMemberQuestion, mcQuestion],
      });

      // We only need a TeamMember answer to fail fast
      const teamMemberAnswer = new TeamMemberSelectionAnswerModel({
        question: teamMemberQuestion._id,
        type: 'Team Member Selection Answer',
        selectedUserIds: [student._id],
      });

      await expect(
        createSubmission(
          pastAssessment._id.toString(),
          ta._id.toString(),
          [teamMemberAnswer],
          false
        )
      ).rejects.toThrow('Assessment is not open for submissions at this time');
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
        account._id.toString(), // faculty => bypass = true
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
      ).rejects.toThrow('Submission not found');
    });

    it('should throw an error if a non-owner, non-faculty user tries to update', async () => {
      // Create a new account with "student" role
      const studentAccount = new AccountModel({
        email: 'someStudent@example.com',
        password: 'password',
        role: 'Student',
        user: student._id,
        isApproved: true,
      });
      await studentAccount.save();

      // Create submission by TA
      const teamMemberAnswer = {
        question: teamMemberQuestion._id,
        type: 'Team Member Selection Answer',
        selectedUserIds: [student._id],
      } as TeamMemberSelectionAnswer;
      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        [teamMemberAnswer],
        false
      );

      // Now the student tries to update the TA's submission
      await expect(
        updateSubmission(
          submission._id.toString(),
          student._id.toString(),
          studentAccount._id.toString(),
          [teamMemberAnswer],
          false
        )
      ).rejects.toThrow('You do not have permission to update this submission.');
    });

    it('should throw an error if assessment is not editable', async () => {
      // Mark the assessment as not editable
      assessment.areSubmissionsEditable = false;
      await assessment.save();

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

      // Switch role from faculty to something that doesn't bypass
      account.role = 'Teaching assistant';
      await account.save();

      await expect(
        updateSubmission(
          submission._id.toString(),
          ta._id.toString(),
          account._id.toString(),
          [teamMemberAnswer, mcAnswer],
          false
        )
      ).rejects.toThrow('Submissions are not editable for this assessment');
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
        deleteSubmission(ta._id.toString(), invalidSubmissionId)
      ).rejects.toThrow('Submission not found');
    });

    it('should throw NotFoundError if submission is already deleted', async () => {
      const teamMemberAnswer = {
        question: teamMemberQuestion._id,
        type: 'Team Member Selection Answer',
        selectedUserIds: [student._id],
      } as TeamMemberSelectionAnswer;

      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        [teamMemberAnswer],
        false
      );
      // First deletion
      await deleteSubmission(ta._id.toString(), submission._id.toString());

      // Attempt to delete again
      await expect(
        deleteSubmission(ta._id.toString(), submission._id.toString())
      ).rejects.toThrow('Submission not found (Deleted)');
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
      expect(submissions[0].user._id.toString()).toEqual(ta._id.toString());
    });

    it('should return an empty array if user has no submissions', async () => {
      const submissions = await getSubmissionsByAssessmentAndUser(
        assessment._id.toString(),
        student._id.toString()
      );
      expect(submissions.length).toBe(0);
    });
  });

  describe('getSubmissionsByAssessment', () => {
    it('should retrieve submissions by assessment', async () => {

      const submissionsInit = await getSubmissionsByAssessment(
        assessment._id.toString()
      );
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

      expect(submissions.length - submissionsInit.length).toBe(1);
      expect(submissions[submissions.length - 1].user._id.toString()).toEqual(ta._id.toString());
    });

    it('should return an empty array if no submissions for assessment exist', async () => {
      // Setup a brand new assessment, no submissions
      const newAssessment = await InternalAssessmentModel.create({
        course: assessment.course,
        assessmentName: 'Empty Assessment',
        description: 'No submissions yet',
        startDate: new Date('2020-01-01'),
        maxMarks: 10,
        granularity: 'individual',
        areSubmissionsEditable: true,
        isReleased: true,
        questions: [],
      });

      const submissions = await getSubmissionsByAssessment(
        newAssessment._id.toString()
      );
      expect(submissions.length).toBe(0);
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
      ).rejects.toThrow('Adjusted score cannot be negative.');
    });

    it('should throw NotFoundError if submission is deleted', async () => {
      // Create then delete
      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        [
          {
            question: teamMemberQuestion._id,
            type: 'Team Member Selection Answer',
            selectedUserIds: [student._id],
          } as TeamMemberSelectionAnswer,
        ],
        false
      );

      await deleteSubmission(ta._id.toString(), submission._id.toString());

      await expect(
        adjustSubmissionScore(submission._id.toString(), 50)
      ).rejects.toThrow('Submission not found (Deleted).');
    });
  });

  //
  // ---------------------------------------------------------------------
  //           REGRADE SUBMISSION TESTS
  // ---------------------------------------------------------------------
  //
  describe('regradeSubmission', () => {
    it('should regrade a normal submission with all recognized question types', async () => {
      // 1) Create a new multi-question assessment
      const multiAssessment = new InternalAssessmentModel({
        course: assessment.course,
        assessmentName: 'Multi-Question Assessment',
        description: 'Testing regrade across multiple types',
        startDate: new Date('2020-01-01'), // Already open
        endDate: null,
        maxMarks: 50,
        questionsTotalMarks: 50,
        scaleToMaxMarks: true,
        granularity: 'individual',
        teamSet: assessment.teamSet,
        areSubmissionsEditable: true,
        isReleased: true,
      });
      await multiAssessment.save();

      // Add an assessment assignment set so that there's a record linking the 'student' or 'ta'
      await AssessmentAssignmentSetModel.create({
        assessment: multiAssessment._id,
        assignedUsers: [{ user: student._id, tas: [ta._id] } as AssignedUser],
      });

      // 2) Create multiple question docs
      const teamMemberQ = await TeamMemberSelectionQuestionModel.create({
        text: 'Select students for grading',
        type: 'Team Member Selection',
        isRequired: true,
        isLocked: false,
        order: 1,
      });

      const numberQ = await NumberQuestionModel.create({
        text: 'Enter a number between 0 and 100',
        type: 'Number',
        isRequired: true,
        isLocked: false,
        isScored: true,
        maxNumber: 100,
        scoringMethod: 'direct',
        maxPoints: 10,
        order: 2,
      });

      const scaleQ = await ScaleQuestionModel.create({
        text: 'Rate from 1 to 5',
        type: 'Scale',
        isRequired: true,
        isLocked: false,
        isScored: true,
        scaleMax: 5,
        labels: [
          { value: 1, label: 'No', points: 0 },
          { value: 5, label: 'Yes', points: 10 },
        ],
        order: 3,
      });

      const multiRespQ = await MultipleResponseQuestionModel.create({
        text: 'Select all correct options',
        type: 'Multiple Response',
        isRequired: true,
        isLocked: false,
        isScored: true,
        allowPartialMarks: true,
        allowNegative: true,
        areWrongAnswersPenalized: true,
        options: [
          { text: 'A', points: 5 },
          { text: 'B', points: -2 },
          { text: 'C', points: 0 },
        ],
        order: 4,
      });

      // 3) Attach them to multiAssessment
      multiAssessment.questions = [
        teamMemberQ._id,
        numberQ._id,
        scaleQ._id,
        multiRespQ._id,
      ];
      await multiAssessment.save();

      // 4) Create the submission
      const submission = await SubmissionModel.create({
        assessment: multiAssessment._id,
        user: ta._id, // We'll treat "ta" as the "grader"
        answers: [],
        isDraft: false,
      });

      // a) Team Member Selection Answer
      const teamMemberAnsDoc = await TeamMemberSelectionAnswerModel.create({
        question: teamMemberQ._id,
        type: 'Team Member Selection Answer',
        selectedUserIds: [student._id.toString()], // Must not be empty
      });
      submission.answers.push(teamMemberAnsDoc);

      // b) Number Answer
      const numAnsDoc = await NumberAnswerModel.create({
        question: numberQ._id,
        type: 'Number Answer',
        value: 50, // halfway
      });
      submission.answers.push(numAnsDoc);

      // c) Scale Answer
      const scaleAnsDoc = await ScaleAnswerModel.create({
        question: scaleQ._id,
        type: 'Scale Answer',
        value: 5, // top
      });
      submission.answers.push(scaleAnsDoc);

      // d) Multiple Response Answer
      const mrAnsDoc = await MultipleResponseAnswerModel.create({
        question: multiRespQ._id,
        type: 'Multiple Response Answer',
        values: ['A', 'B'], // includes a negative option
      });
      submission.answers.push(mrAnsDoc);

      await submission.save();

      // 5) Create an AssessmentResult doc for the "student" that appears in selectedUserIds
      const newAssessmentResult = await AssessmentResultModel.create({
        assessment: multiAssessment._id,
        student: student._id, // match the "selectedUserIds"
        marks: [
          {
            marker: ta._id,
            submission: submission._id,
            score: 0, // will get updated
          },
        ],
      });

      // 6) Regrade
      const regradedSubmission = await regradeSubmission(submission._id.toString());

      // 7) Checks
      expect(regradedSubmission).toBeDefined();
      expect(regradedSubmission!.score).toBeGreaterThan(0);

      // The AssessmentResult should be updated
      const updatedResult = await AssessmentResultModel.findById(newAssessmentResult._id);
      expect(updatedResult).toBeDefined();
      const markEntry = updatedResult!.marks.find(
        m => m.submission.toString() === submission._id.toString()
      );
      expect(markEntry).toBeDefined();
      expect(markEntry!.score).toEqual(regradedSubmission!.score);
    });

    it('should throw NotFoundError if submission does not exist', async () => {
      const badId = new mongoose.Types.ObjectId().toString();
      await expect(regradeSubmission(badId)).rejects.toThrow(
        `Submission with ID ${badId} not found`
      );
    });

    it('should throw NotFoundError if submission is soft-deleted', async () => {
      // Create a minimal submission
      const s = await SubmissionModel.create({
        assessment: assessment._id,
        user: ta._id,
        answers: [],
        isDraft: false,
        deleted: true, // Soft deleted
      });
      await expect(regradeSubmission(s._id.toString())).rejects.toThrow(
        `Submission with ID ${s._id.toString()} not found (Deleted)`
      );
    });

    it('should throw NotFoundError if submission creator is missing', async () => {
      // Create a userless submission
      const someSubmission = await SubmissionModel.create({
        assessment: assessment._id,
        user: new mongoose.Types.ObjectId(), // Nonexistent user
        answers: [],
        isDraft: false,
      });
      await expect(regradeSubmission(someSubmission._id.toString())).rejects.toThrow(
        'Submission creator not found'
      );
    });

    it('should remove orphan answers that do not match a question in the assessment', async () => {
      // Create submission with an 'orphan' answer
      const orphanQ = await ShortResponseQuestionModel.create({
        text: 'Orphan short question',
        type: 'Short Response',
        shortResponsePlaceholder: 'Unused placeholder',
        isRequired: true,
        isLocked: false,
        isScored: true,
        order: 3,
      });

      const orphanAns = await ShortResponseAnswerModel.create({
        question: orphanQ,
        type: 'Short Response Answer',
        value: 'Hello Orphan',
      });

      // Must still have one TeamMemberSelectionAnswer to pass the regrade code
      const teamAnswerDoc = await TeamMemberSelectionAnswerModel.create({
        question: teamMemberQuestion, // a question in the "main" assessment
        type: 'Team Member Selection Answer',
        selectedUserIds: [student._id.toString()],
      });

      const newSubmission = await SubmissionModel.create({
        assessment: assessment._id,
        user: ta._id,
        answers: [teamAnswerDoc, orphanAns],
        isDraft: false,
      });

      // Also create an AssessmentResult
      await AssessmentResultModel.create({
        assessment: assessment._id,
        student: student._id,
        marks: [
          {
            marker: ta._id,
            submission: newSubmission._id,
            score: 0,
          },
        ],
      });

      // regrade -> triggers the orphan answer removal
      const regraded = await regradeSubmission(newSubmission._id.toString());
      expect(regraded).toBeDefined();
      // Only the Team Member Selection answer should remain
      expect(regraded!.answers.length).toBe(2);

      // The orphan answer doc should be deleted from DB
      const orphanCheck = await ShortResponseAnswerModel.findById(orphanAns._id);
      expect(orphanCheck).toBeNull();
    });

    it('should assign score = 0 if question doc not found at switch', async () => {
      // We'll create a recognized question, then remove it from DB
      const numberQ = await NumberQuestionModel.create({
        text: 'Number question to remove',
        type: 'Number',
        isScored: true,
        scoringMethod: 'direct',
        maxNumber: 100,
        maxPoints: 10,
        order: 3,
      });

      assessment.questions.push(numberQ._id);
      await assessment.save();

      const numAnswer = await NumberAnswerModel.create({
        question: numberQ._id,
        type: 'Number Answer',
        value: 50,
      });

      // Must have a TeamMemberSelectionAnswer
      const tmAnswer = await TeamMemberSelectionAnswerModel.create({
        question: teamMemberQuestion._id,
        type: 'Team Member Selection Answer',
        selectedUserIds: [student._id],
      });

      const sub = await SubmissionModel.create({
        assessment: assessment._id,
        user: ta._id,
        answers: [tmAnswer, numAnswer],
        isDraft: false,
      });

      // Also create an AssessmentResult
      await AssessmentResultModel.create({
        assessment: assessment._id,
        student: student._id,
        marks: [
          {
            marker: ta._id,
            submission: sub._id,
            score: 0,
          },
        ],
      });

      // Remove the question from DB
      await NumberQuestionModel.findByIdAndDelete(numberQ._id);

      const updated = await regradeSubmission(sub._id.toString());
      expect(updated).toBeDefined();
      // Because the question is not found => totalScore => 0
      expect(updated!.score).toBe(0);
    });

    it('should warn and return if cannot parse answer type (no SaveAnswerModel)', async () => {
      // Must still have a valid "Team Member Selection Answer"
      const tmAnswerDoc = await TeamMemberSelectionAnswerModel.create({
        question: teamMemberQuestion,
        type: 'Team Member Selection Answer',
        selectedUserIds: [student._id.toString()],
      });

      // We'll create a submission with a "bogus" answer type
      const sub = await SubmissionModel.create({
        assessment: assessment._id,
        user: ta._id,
        answers: [
          tmAnswerDoc,
          {
            question: teamMemberQuestion,
            type: 'Bogus Answer', // not recognized in switch
            score: 0,
          } as any,
        ],
      });

      // Also create an AssessmentResult
      await AssessmentResultModel.create({
        assessment: assessment._id,
        student: student._id,
        marks: [
          {
            marker: ta._id,
            submission: sub._id,
            score: 0,
          },
        ],
      });

      const updated = await regradeSubmission(sub._id.toString());
      // Because "Cannot parse answer type 'Bogus Answer'", regrade returns early => `undefined`
      // The submission won't be updated => updated is `undefined`
      expect(updated).toBeUndefined();
    });

    it('should create a new answer doc if the old savedAnswer is not found', async () => {
      // We'll create a legit date question
      const dateQ = await DateQuestionModel.create({
        text: 'Select a date',
        type: 'Date',
        isScored: false,
        order: 3,
        isRange: false,
      });
      assessment.questions.push(dateQ._id);
      await assessment.save();

      const sub = await SubmissionModel.create({
        assessment: assessment._id,
        user: ta._id,
        answers: [],
      });

      // Build a date answer referencing a nonexistent doc
      // plus a team-member answer
      const teamAnsDoc = await TeamMemberSelectionAnswerModel.create({
        question: teamMemberQuestion,
        type: 'Team Member Selection Answer',
        selectedUserIds: [student._id],
      });

      const fakeDateAnswer = {
        _id: new mongoose.Types.ObjectId(), // doesn't exist in DB
        question: dateQ,
        type: 'Date Answer',
        value: new Date(),
      };

      sub.answers = [teamAnsDoc, fakeDateAnswer as any];
      await sub.save();

      // Also create an AssessmentResult
      await AssessmentResultModel.create({
        assessment: assessment._id,
        student: student._id,
        marks: [
          {
            marker: ta._id,
            submission: sub._id,
            score: 0,
          },
        ],
      });

      const updated = await regradeSubmission(sub._id.toString());
      expect(updated).toBeDefined();
      // Because the date question is not scored => total = 0
      expect(updated!.score).toBe(0);

      // The old doc didn't exist, so "Answer does not exist!" => new doc created
      expect(updated!.answers.length).toBe(2); // the team answer + newly saved date answer
    });

    it('should throw NotFoundError if no assessment result found for that user in that assessment', async () => {
      // We'll create a normal submission, but remove the AssessmentResult doc
      const teamAnsDoc = await TeamMemberSelectionAnswerModel.create({
        question: teamMemberQuestion,
        type: 'Team Member Selection Answer',
        selectedUserIds: [ta._id],
      });
      const sub = await SubmissionModel.create({
        assessment: assessment._id,
        user: ta._id,
        answers: [
          teamAnsDoc
        ],
      });

      // Manually remove the assessment result for that user
      await AssessmentResultModel.deleteMany({
        assessment: assessment._id,
        student: ta._id,
      });

      await expect(regradeSubmission(sub._id.toString())).rejects.toThrow(
        `No assessment result found for student ${ta._id.toString()} in assessment ${assessment._id.toString()}`
      );
    });

    it('should add a new mark entry if mark entry does not exist yet', async () => {
      // We'll create a submission that references the TA in selectedUserIds
      const sub = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        [
          {
            question: teamMemberQuestion._id,
            type: 'Team Member Selection Answer',
            selectedUserIds: [ta._id],
          } as TeamMemberSelectionAnswer,
        ],
        false
      );

      const resultDoc = await AssessmentResultModel.findOne({
        assessment: assessment._id,
        student: ta._id,
      });
      // Clear any existing marks
      resultDoc!.marks = [];
      await resultDoc!.save();

      // Regrade => should push a new MarkEntry
      const updated = await regradeSubmission(sub._id.toString());
      expect(updated).toBeDefined();
      expect(updated!.score).toBe(0); // no other scored questions
      const finalResult = await AssessmentResultModel.findById(resultDoc!._id);
      expect(finalResult).toBeDefined();
      expect(finalResult!.marks.length).toBe(1);
      expect(finalResult!.marks[0].submission.toString()).toEqual(sub._id.toString());
    });
  });
});
