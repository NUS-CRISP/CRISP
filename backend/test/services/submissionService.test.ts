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
  regradeSubmission,
} from '../../services/submissionService';

import {
  TeamMemberSelectionAnswerModel,
  MultipleResponseAnswerModel,
  ScaleAnswerModel,
  NumberAnswerModel,
  ShortResponseAnswerModel,
  TeamMemberSelectionAnswer,
  MultipleChoiceAnswer,
  MultipleResponseAnswer,
  ScaleAnswer,
  NumberAnswer,
  ShortResponseAnswer,
  LongResponseAnswer,
  DateAnswer,
  NUSNETIDAnswer,
  NUSNETEmailAnswer,
  UndecidedAnswer,
} from '@models/Answer';
import CourseModel from '@models/Course';
import TeamSetModel from '@models/TeamSet';
import {
  MultipleChoiceQuestionModel,
  MultipleResponseQuestionModel,
  ScaleQuestionModel,
  NumberQuestionModel,
  DateQuestionModel,
  ShortResponseQuestionModel,
  LongResponseQuestionModel,
  TeamMemberSelectionQuestionModel,
  NUSNETIDQuestionModel,
  NUSNETEmailQuestionModel,
  UndecidedQuestionModel,
  MultipleChoiceOption,
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

// We keep references to the first three questions (by index) for convenience
let teamMemberQuestion: any; // index 0
let mcQuestion: any;         // index 1
// let shortQuestion: any;      // index 12

/**
 * Helper that builds a full array of 21 answers (one per question in assessment.questions).
 * We assume assessment.questions has 21 items (index 0..20).
 *
 * Depending on your scenario, you might need the real docs rather than
 * just assessment.questions[i]._id. Here we assume each is a Mongoose doc or object
 * with an _id property. You can tweak the data if needed (like changing 'value', etc.).
 */
function buildAllAnswers(assessment: any, userId: string) {
  const questions = assessment.questions;

  const answers = [
    // 0. Team Member Selection
    {
      question: questions[0]._id,
      type: 'Team Member Selection Answer',
      selectedUserIds: [userId], // typically an array of userIds
    } as TeamMemberSelectionAnswer,

    // 1. Multiple Choice (scored)
    {
      question: questions[1]._id,
      type: 'Multiple Choice Answer',
      value: 'Option B', // 10 points
    } as MultipleChoiceAnswer,

    // 2. Multiple Choice (non-scored)
    {
      question: questions[2]._id,
      type: 'Multiple Choice Answer',
      value: 'NS Option A',
    } as MultipleChoiceAnswer,

    // 3. Scale (scored)
    {
      question: questions[3]._id,
      type: 'Scale Answer',
      value: 3, // somewhere in the middle
    } as ScaleAnswer,

    // 4. Scale (non-scored)
    {
      question: questions[4]._id,
      type: 'Scale Answer',
      value: 1,
    } as ScaleAnswer,

    // 5. Number (scored, direct)
    {
      question: questions[5]._id,
      type: 'Number Answer',
      value: 50,
    } as NumberAnswer,

    // 6. Number (scored, range)
    {
      question: questions[6]._id,
      type: 'Number Answer',
      value: 75,
    } as NumberAnswer,

    // 7. Number (non-scored)
    {
      question: questions[7]._id,
      type: 'Number Answer',
      value: 123,
    } as NumberAnswer,

    // 8. Multiple Response (scored, partial+negative)
    {
      question: questions[8]._id,
      type: 'Multiple Response Answer',
      values: ['A', 'C'],
    } as MultipleResponseAnswer,

    // 9. Multiple Response (scored, partial+no negatives)
    {
      question: questions[9]._id,
      type: 'Multiple Response Answer',
      values: ['E', 'F'],
    } as MultipleResponseAnswer,

    // 10. Multiple Response (scored, no partial, no penalty)
    {
      question: questions[10]._id,
      type: 'Multiple Response Answer',
      values: ['I', 'J'],
    } as MultipleResponseAnswer,

    // 11. Multiple Response (non-scored)
    {
      question: questions[11]._id,
      type: 'Multiple Response Answer',
      values: ['M', 'O'],
    } as MultipleResponseAnswer,

    // 12. Short Response (scored)
    {
      question: questions[12]._id,
      type: 'Short Response Answer',
      value: 'Short scored answer!',
    } as ShortResponseAnswer,

    // 13. Short Response (non-scored)
    {
      question: questions[13]._id,
      type: 'Short Response Answer',
      value: 'Short non-scored answer.',
    } as ShortResponseAnswer,

    // 14. Long Response (scored)
    {
      question: questions[14]._id,
      type: 'Long Response Answer',
      value: 'Long response for scored question!',
    } as LongResponseAnswer,

    // 15. Long Response (non-scored)
    {
      question: questions[15]._id,
      type: 'Long Response Answer',
      value: 'Long response for non-scored question!',
    } as LongResponseAnswer,

    // 16. Date (non-range, non-scored)
    {
      question: questions[16]._id,
      type: 'Date Answer',
      value: new Date('2024-02-15'),
    } as DateAnswer,

    // 17. Date (range, scored)
    {
      question: questions[17]._id,
      type: 'Date Answer',
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-02-10'),
    } as DateAnswer,

    // 18. NUSNET ID
    {
      question: questions[18]._id,
      type: 'NUSNET ID Answer',
      value: 'E0123456',
    } as NUSNETIDAnswer,

    // 19. NUSNET Email
    {
      question: questions[19]._id,
      type: 'NUSNET Email Answer',
      value: 'e0123456@nus.edu.sg',
    } as NUSNETEmailAnswer,

    // 20. Undecided (scored = false by default)
    {
      question: questions[20]._id,
      type: 'Undecided Answer',
    } as UndecidedAnswer,
  ];

  return answers;
}

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
  teamMemberQuestion = data.teamMemberQuestion; // index 0
  mcQuestion = data.mcQuestion;                 // index 1
  // shortQuestion = data.shortQuestion;           // index 12
});

afterAll(async () => {
  if (mongo) {
    await mongo.stop();
  }
  await mongoose.connection.close();
});

/**
 * Single helper to initialize main data once:
 *   1) Creates an Account document (faculty).
 *   2) Creates a Course + Team + TeamSet + 21 distinct question documents (0..20).
 *   3) Creates an InternalAssessment doc that references those 21 questions.
 *   4) Creates an AssessmentAssignmentSet referencing the student/TA.
 *   5) Returns references for the global usage in tests.
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

  // ----------------------------------------------------------------------------------
  // Create the full question set (0-20)
  // 0. Team Member Selection (required)
  const q0 = await TeamMemberSelectionQuestionModel.create({
    text: 'Select students',
    type: 'Team Member Selection',
    isRequired: true,
    isLocked: true,
    order: 1,
  });

  // 1. Multiple Choice (scored)
  const q1 = await MultipleChoiceQuestionModel.create({
    text: 'Multiple Choice Question (scored)',
    type: 'Multiple Choice',
    isRequired: true,
    isLocked: false,
    isScored: true,
    options: [
      { text: 'Option A', points: 5 },
      { text: 'Option B', points: 10 },
    ] as MultipleChoiceOption[],
    order: 2,
  });

  // 2. Multiple Choice (non-scored)
  const q2 = await MultipleChoiceQuestionModel.create({
    text: 'Multiple Choice Question (non-scored)',
    type: 'Multiple Choice',
    isRequired: true,
    isLocked: false,
    isScored: false,
    options: [
      { text: 'NS Option A', points: 1 },
      { text: 'NS Option B', points: 2 },
    ] as MultipleChoiceOption[],
    order: 3,
  });

  // 3. Scale (scored)
  const q3 = await ScaleQuestionModel.create({
    text: 'Rate from 1 to 5 (scored)',
    type: 'Scale',
    isRequired: true,
    isLocked: false,
    isScored: true,
    scaleMax: 5,
    labels: [
      { value: 1, label: 'Very Bad', points: 0 },
      { value: 3, label: 'Neutral', points: 5 },
      { value: 5, label: 'Very Good', points: 10 },
    ],
    order: 4,
  });

  // 4. Scale (non-scored)
  const q4 = await ScaleQuestionModel.create({
    text: 'Rate from 1 to 5 (non-scored)',
    type: 'Scale',
    isRequired: true,
    isLocked: false,
    isScored: false,
    scaleMax: 5,
    labels: [
      { value: 1, label: 'Bad', points: 0 },
      { value: 5, label: 'Good', points: 10 },
    ],
    order: 5,
  });

  // 5. Number (scored, direct)
  const q5 = await NumberQuestionModel.create({
    text: 'Enter a number between 1 and 100 (direct)',
    type: 'Number',
    isRequired: true,
    isLocked: false,
    isScored: true,
    maxNumber: 100,
    scoringMethod: 'direct',
    maxPoints: 10,
    order: 6,
  });

  // 6. Number (scored, range)
  const q6 = await NumberQuestionModel.create({
    text: 'Range-based Number Question (scored)',
    type: 'Number',
    isRequired: true,
    isLocked: false,
    isScored: true,
    maxNumber: 100,
    scoringMethod: 'range',
    scoringRanges: [
      { minValue: 0, maxValue: 50, points: 5 },
      { minValue: 51, maxValue: 100, points: 10 },
    ],
    order: 7,
  });

  // 7. Number (non-scored)
  const q7 = await NumberQuestionModel.create({
    text: 'Number question (non-scored)',
    type: 'Number',
    isRequired: true,
    isLocked: false,
    isScored: false,
    maxNumber: 999,
    scoringMethod: 'None',
    order: 8,
  });

  // 8. Multiple Response (scored, partial+negative)
  const q8 = await MultipleResponseQuestionModel.create({
    text: 'Select all correct options (partial + negative)',
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
      { text: 'C', points: 3 },
      { text: 'D', points: 0 },
    ],
    order: 9,
  });

  // 9. Multiple Response (scored, partial+no negatives)
  const q9 = await MultipleResponseQuestionModel.create({
    text: 'Partial marks only, no negatives',
    type: 'Multiple Response',
    isRequired: true,
    isLocked: false,
    isScored: true,
    allowPartialMarks: true,
    allowNegative: false,
    areWrongAnswersPenalized: false,
    options: [
      { text: 'E', points: 4 },
      { text: 'F', points: 6 },
      { text: 'G', points: -3 },
      { text: 'H', points: 0 },
    ],
    order: 10,
  });

  // 10. Multiple Response (scored, no partial, no penalty)
  const q10 = await MultipleResponseQuestionModel.create({
    text: 'No partial marks, no penalties',
    type: 'Multiple Response',
    isRequired: true,
    isLocked: false,
    isScored: true,
    allowPartialMarks: false,
    allowNegative: false,
    areWrongAnswersPenalized: false,
    options: [
      { text: 'I', points: 5 },
      { text: 'J', points: 7 },
      { text: 'K', points: -1 },
      { text: 'L', points: 0 },
    ],
    order: 11,
  });

  // 11. Multiple Response (non-scored)
  const q11 = await MultipleResponseQuestionModel.create({
    text: 'Multiple Response (non-scored)',
    type: 'Multiple Response',
    isRequired: true,
    isLocked: false,
    isScored: false,
    allowPartialMarks: true,
    allowNegative: true,
    areWrongAnswersPenalized: true,
    options: [
      { text: 'M', points: 10 },
      { text: 'N', points: -5 },
      { text: 'O', points: 8 },
      { text: 'P', points: -3 },
    ],
    order: 12,
  });

  // 12. Short Response (scored)
  const q12 = await ShortResponseQuestionModel.create({
    text: 'Short Response Question (scored)',
    type: 'Short Response',
    isRequired: true,
    isLocked: false,
    isScored: true,
    shortResponsePlaceholder: 'Type here...',
    order: 13,
  });

  // 13. Short Response (non-scored)
  const q13 = await ShortResponseQuestionModel.create({
    text: 'Short Response Question (non-scored)',
    type: 'Short Response',
    isRequired: true,
    isLocked: false,
    isScored: false,
    shortResponsePlaceholder: 'Type here...',
    order: 14,
  });

  // 14. Long Response (scored)
  const q14 = await LongResponseQuestionModel.create({
    text: 'Long Response Question (scored)',
    type: 'Long Response',
    isRequired: false,
    isLocked: false,
    isScored: true,
    longResponsePlaceholder: 'Elaborate here...',
    order: 15,
  });

  // 15. Long Response (non-scored)
  const q15 = await LongResponseQuestionModel.create({
    text: 'Long Response Question (non-scored)',
    type: 'Long Response',
    isRequired: false,
    isLocked: false,
    isScored: false,
    longResponsePlaceholder: 'Elaborate here...',
    order: 16,
  });

  // 16. Date (non-range, non-scored)
  const q16 = await DateQuestionModel.create({
    text: 'Select a single date (non-scored)',
    type: 'Date',
    isRequired: true,
    isLocked: false,
    isScored: false,
    isRange: false,
    order: 17,
  });

  // 17. Date (range, scored)
  const q17 = await DateQuestionModel.create({
    text: 'Select a date range (scored)',
    type: 'Date',
    isRequired: true,
    isLocked: false,
    isScored: true,
    isRange: true,
    order: 18,
  });

  // 18. NUSNET ID
  const q18 = await NUSNETIDQuestionModel.create({
    text: 'Enter NUSNET ID',
    type: 'NUSNET ID',
    isRequired: true,
    isLocked: false,
    shortResponsePlaceholder: 'e.g., E0123456',
    order: 19,
  });

  // 19. NUSNET Email
  const q19 = await NUSNETEmailQuestionModel.create({
    text: 'Enter NUSNET Email',
    type: 'NUSNET Email',
    isRequired: true,
    isLocked: false,
    shortResponsePlaceholder: 'e0123456@nus.edu.sg',
    order: 20,
  });

  // 20. Undecided (scored=false by default)
  const q20 = await UndecidedQuestionModel.create({
    text: 'Undecided Question',
    type: 'Undecided',
    isRequired: true,
    isLocked: false,
    order: 21,
  });

  // Collect them all
  const allQuestions = [
    q0, q1, q2, q3, q4, q5, q6, q7, q8, q9,
    q10, q11, q12, q13, q14, q15, q16, q17,
    q18, q19, q20,
  ];

  // Create the assessment
  const startDate = new Date();
  // Make the assessment window open for the test
  startDate.setUTCFullYear(new Date().getUTCFullYear() - 1);

  const assessment = new InternalAssessmentModel({
    course: course._id,
    assessmentName: 'Midterm Exam',
    description: 'Midterm assessment',
    startDate: startDate,
    endDate: overrideEndDate || null,
    maxMarks: 10,
    scaleToMaxMarks: true,
    granularity: 'individual',
    teamSet: teamSet._id,
    areSubmissionsEditable: true,
    results: [],
    isReleased: true,
    releaseNumber: 1,
    questions: allQuestions,
  });
  assessment.questionsTotalMarks = 10;
  await assessment.save();

  // Create assignment set
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
    // For direct references:
    teamMemberQuestion: q0,
    mcQuestion: q1,
    shortQuestion: q12,
  };
};

describe('submissionService', () => {
  //
  // NOTE: We rely on the single call to setupData() in beforeAll.
  // Our test objects (assessment, student, etc.) are global references.
  //

  describe('createSubmission', () => {
    it('should create a new submission', async () => {
      const fullAnswers = buildAllAnswers(assessment, student._id.toString());
      // Optionally change the TMS to reference the student
      (fullAnswers[0] as TeamMemberSelectionAnswer).selectedUserIds = [student._id.toString()];

      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        fullAnswers,
        false
      );

      expect(submission).toBeDefined();
      expect(submission.user.toString()).toEqual(ta._id.toString());
      // We created an answer for each question => 21
      expect(submission.answers.length).toBe(21);
    });

    it('should throw NotFoundError if user not found', async () => {
      const invalidUserId = new mongoose.Types.ObjectId().toString();
      const fullAnswers = buildAllAnswers(assessment, student._id.toString());

      await expect(
        createSubmission(
          assessment._id.toString(),
          invalidUserId,
          fullAnswers,
          false
        )
      ).rejects.toThrowError('Submission creator not found');
    });

    it('should throw an error if no Team Member Selection Answer is provided', async () => {
      const fullAnswers = buildAllAnswers(assessment, student._id.toString());
      // Remove the TMS (index 0) from the array
      fullAnswers.splice(0, 1);

      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          fullAnswers,
          false
        )
      ).rejects.toThrow();
    });

    it('should throw an error if question is not in assessment', async () => {
      // Create an orphan question
      const orphanQuestion = await MultipleChoiceQuestionModel.create({
        text: 'Orphan question',
        type: 'Multiple Choice',
        isRequired: true,
        isLocked: false,
        isScored: true,
        options: [{ text: 'Test Option A', points: 2 }],
        order: 999,
      });

      const fullAnswers = buildAllAnswers(assessment, student._id.toString());
      // Append an answer referencing the orphan question
      fullAnswers.push({
        question: orphanQuestion._id,
        type: 'Multiple Choice Answer',
        value: 'Test Option A',
      } as MultipleChoiceAnswer);

      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          fullAnswers,
          false
        )
      ).rejects.toThrowError(
        `Question ${orphanQuestion._id.toString()} not found in this assessment`
      );
    });

    it('should throw an error if question type mismatches answer type', async () => {
      const fullAnswers = buildAllAnswers(assessment, student._id.toString());
      // For index 1 => "Multiple Choice" question, forcibly change answer type to TMS
      fullAnswers[1].type = 'Team Member Selection Answer';

      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          fullAnswers,
          false
        )
      ).rejects.toThrow(
        `Answer type "Team Member Selection Answer" does not match question type "Multiple Choice" for question ${mcQuestion._id.toString()}`
      );
    });

    it('should throw an error if outside submission period (start in future)', async () => {
      const futureStart = new Date();
      futureStart.setFullYear(new Date().getFullYear() + 1);

      // We'll create a simpler assessment with just two questions
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
        questions: [teamMemberQuestion, mcQuestion], // only these two
      });

      // Build partial answers for those two questions only
      const partialAnswers = [
        {
          question: teamMemberQuestion._id,
          type: 'Team Member Selection Answer',
          selectedUserIds: [student._id],
        } as TeamMemberSelectionAnswer,
        {
          question: mcQuestion._id,
          type: 'Multiple Choice Answer',
          value: 'Option B',
        } as MultipleChoiceAnswer,
      ];

      await expect(
        createSubmission(
          futureAssessment._id.toString(),
          ta._id.toString(),
          partialAnswers,
          false
        )
      ).rejects.toThrow('Assessment is not open for submissions at this time');
    });

    it('should throw an error if outside submission period (end date in the past)', async () => {
      const now = new Date();
      const pastEnd = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());

      const pastAssessment = await InternalAssessmentModel.create({
        course: assessment.course,
        assessmentName: 'Expired Assessment',
        description: 'End date in the past',
        startDate: new Date('2020-01-01'),
        endDate: pastEnd,
        maxMarks: 10,
        scaleToMaxMarks: true,
        granularity: 'individual',
        teamSet: assessment.teamSet,
        areSubmissionsEditable: true,
        isReleased: true,
        questions: [teamMemberQuestion, mcQuestion],
      });

      // Minimal answers referencing these two questions
      const partialAnswers = [
        {
          question: teamMemberQuestion._id,
          type: 'Team Member Selection Answer',
          selectedUserIds: [student._id],
        } as TeamMemberSelectionAnswer,
      ];

      await expect(
        createSubmission(
          pastAssessment._id.toString(),
          ta._id.toString(),
          partialAnswers,
          false
        )
      ).rejects.toThrow('Assessment is not open for submissions at this time');
    });
  });

  describe('updateSubmission', () => {
    it('should update a submission', async () => {
      // First create with full answers
      let fullAnswers = buildAllAnswers(assessment, student._id.toString());
      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        fullAnswers,
        true
      );

      const result = await AssessmentResultModel.findOne({
        student: student._id,
        assessment: assessment._id,
      });
      expect(result).toBeDefined();

      // Now we update: for instance, let's change the MC (index 1) from 'Option B' to 'Option A'
      fullAnswers = buildAllAnswers(assessment, student._id.toString());
      (fullAnswers[1] as MultipleChoiceAnswer).value = 'Option A';

      const updatedSubmission = await updateSubmission(
        submission._id.toString(),
        ta._id.toString(),
        account._id.toString(), // faculty => bypass = true
        fullAnswers,
        false
      );
      expect(updatedSubmission.isDraft).toBe(false);
    });

    it('should throw NotFoundError if submission not found', async () => {
      const invalidSubmissionId = new mongoose.Types.ObjectId().toString();
      const fullAnswers = buildAllAnswers(assessment, student._id.toString());

      await expect(
        updateSubmission(
          invalidSubmissionId,
          ta._id.toString(),
          account._id.toString(),
          fullAnswers,
          false
        )
      ).rejects.toThrow('Submission not found');
    });

    it('should throw an error if a non-owner, non-faculty user tries to update', async () => {
      const studentAccount = new AccountModel({
        email: 'someStudent@example.com',
        password: 'password',
        role: 'Student',
        user: student._id,
        isApproved: true,
      });
      await studentAccount.save();

      // Create submission by TA
      const fullAnswers = buildAllAnswers(assessment, student._id.toString());
      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        fullAnswers,
        false
      );

      // Now the student tries to update
      await expect(
        updateSubmission(
          submission._id.toString(),
          student._id.toString(),
          studentAccount._id.toString(),
          fullAnswers,
          false
        )
      ).rejects.toThrow('You do not have permission to update this submission.');
    });

    it('should throw an error if assessment is not editable', async () => {
      assessment.areSubmissionsEditable = false;
      await assessment.save();

      // Create a submission
      const fullAnswers = buildAllAnswers(assessment, student._id.toString());
      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        fullAnswers,
        false
      );

      // Switch role from faculty to TA => no bypass
      account.role = 'Teaching assistant';
      await account.save();

      await expect(
        updateSubmission(
          submission._id.toString(),
          ta._id.toString(),
          account._id.toString(),
          fullAnswers,
          false
        )
      ).rejects.toThrow('Submissions are not editable for this assessment');
    });
  });

  describe('deleteSubmission', () => {
    it('should delete a submission by ID', async () => {
      const fullAnswers = buildAllAnswers(assessment, student._id.toString());
      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        fullAnswers,
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
      const fullAnswers = buildAllAnswers(assessment, student._id.toString());
      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        fullAnswers,
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
      const fullAnswers = buildAllAnswers(assessment, student._id.toString());
      await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        fullAnswers,
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

      const fullAnswers = buildAllAnswers(assessment, student._id.toString());
      await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        fullAnswers,
        false
      );

      const submissions = await getSubmissionsByAssessment(
        assessment._id.toString()
      );
      expect(submissions.length - submissionsInit.length).toBe(1);
      expect(submissions[submissions.length - 1].user._id.toString()).toEqual(
        ta._id.toString()
      );
    });

    it('should return an empty array if no submissions for assessment exist', async () => {
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
      const fullAnswers = buildAllAnswers(assessment, student._id.toString());
      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        fullAnswers,
        false
      );

      const adjustedSubmission = await adjustSubmissionScore(
        submission._id.toString(),
        85
      );
      expect(adjustedSubmission.adjustedScore).toBe(85);
    });

    it('should throw error for negative score adjustment', async () => {
      const fullAnswers = buildAllAnswers(assessment, student._id.toString());
      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        fullAnswers,
        false
      );

      await expect(
        adjustSubmissionScore(submission._id.toString(), -5)
      ).rejects.toThrow('Adjusted score cannot be negative.');
    });

    it('should throw NotFoundError if submission is deleted', async () => {
      const fullAnswers = buildAllAnswers(assessment, student._id.toString());
      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        fullAnswers,
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
      // For demonstration, we keep your original approach: custom multiAssessment
      // with multiple question docs, then we push answers, etc.

      const multiAssessment = new InternalAssessmentModel({
        course: assessment.course,
        assessmentName: 'Multi-Question Assessment',
        description: 'Testing regrade across multiple types',
        startDate: new Date('2020-01-01'),
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

      await AssessmentAssignmentSetModel.create({
        assessment: multiAssessment._id,
        assignedUsers: [{ user: student._id, tas: [ta._id] } as AssignedUser],
      });

      // Create multiple question docs
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

      // Attach them to multiAssessment
      multiAssessment.questions = [
        teamMemberQ._id,
        numberQ._id,
        scaleQ._id,
        multiRespQ._id,
      ];
      await multiAssessment.save();

      // Create a submission
      const submission = await SubmissionModel.create({
        assessment: multiAssessment._id,
        user: ta._id,
        answers: [],
        isDraft: false,
      });

      // Build + save the answers
      const teamMemberAnsDoc = await TeamMemberSelectionAnswerModel.create({
        question: teamMemberQ._id,
        type: 'Team Member Selection Answer',
        selectedUserIds: [student._id.toString()],
      });
      submission.answers.push(teamMemberAnsDoc);

      const numAnsDoc = await NumberAnswerModel.create({
        question: numberQ._id,
        type: 'Number Answer',
        value: 50,
      });
      submission.answers.push(numAnsDoc);

      const scaleAnsDoc = await ScaleAnswerModel.create({
        question: scaleQ._id,
        type: 'Scale Answer',
        value: 5,
      });
      submission.answers.push(scaleAnsDoc);

      const mrAnsDoc = await MultipleResponseAnswerModel.create({
        question: multiRespQ._id,
        type: 'Multiple Response Answer',
        values: ['A', 'B'],
      });
      submission.answers.push(mrAnsDoc);

      await submission.save();

      // Create an AssessmentResult doc
      const newAssessmentResult = await AssessmentResultModel.create({
        assessment: multiAssessment._id,
        student: student._id,
        marks: [
          {
            marker: ta._id,
            submission: submission._id,
            score: 0,
          },
        ],
      });

      // Regrade
      const regradedSubmission = await regradeSubmission(submission._id.toString());
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
      const s = await SubmissionModel.create({
        assessment: assessment._id,
        user: ta._id,
        answers: [],
        isDraft: false,
        deleted: true,
      });
      await expect(regradeSubmission(s._id.toString())).rejects.toThrow(
        `Submission with ID ${s._id.toString()} not found (Deleted)`
      );
    });

    it('should throw NotFoundError if submission creator is missing', async () => {
      const someSubmission = await SubmissionModel.create({
        assessment: assessment._id,
        user: new mongoose.Types.ObjectId(), // Nonexistent user
        answers: [],
        isDraft: false,
      });
      await expect(
        regradeSubmission(someSubmission._id.toString())
      ).rejects.toThrow('Submission creator not found');
    });

    it('should remove orphan answers that do not match a question in the assessment', async () => {
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

      const teamAnswerDoc = await TeamMemberSelectionAnswerModel.create({
        question: teamMemberQuestion,
        type: 'Team Member Selection Answer',
        selectedUserIds: [student._id.toString()],
      });

      const newSubmission = await SubmissionModel.create({
        assessment: assessment._id,
        user: ta._id,
        answers: [teamAnswerDoc, orphanAns],
        isDraft: false,
      });

      await AssessmentResultModel.create({
        assessment: assessment._id,
        student: student._id,
        marks: [{ marker: ta._id, submission: newSubmission._id, score: 0 }],
      });

      const regraded = await regradeSubmission(newSubmission._id.toString());
      expect(regraded).toBeDefined();
      expect(regraded!.answers.length).toBe(2); // The TMS answer + the "wrapper" doc
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

      await AssessmentResultModel.create({
        assessment: assessment._id,
        student: student._id,
        marks: [{ marker: ta._id, submission: sub._id, score: 0 }],
      });

      // Now remove the question doc
      await NumberQuestionModel.findByIdAndDelete(numberQ._id);

      const updated = await regradeSubmission(sub._id.toString());
      expect(updated).toBeDefined();
      // Because the question is not found => totalScore => 0
      expect(updated!.score).toBe(0);
    });

    it('should warn and return if cannot parse answer type (no SaveAnswerModel)', async () => {
      const tmAnswerDoc = await TeamMemberSelectionAnswerModel.create({
        question: teamMemberQuestion,
        type: 'Team Member Selection Answer',
        selectedUserIds: [student._id.toString()],
      });

      // We'll create a submission with a "Bogus" answer type
      const sub = await SubmissionModel.create({
        assessment: assessment._id,
        user: ta._id,
        answers: [
          tmAnswerDoc,
          {
            question: teamMemberQuestion,
            type: 'Bogus Answer',
            score: 0,
          } as any,
        ],
      });

      await AssessmentResultModel.create({
        assessment: assessment._id,
        student: student._id,
        marks: [{ marker: ta._id, submission: sub._id, score: 0 }],
      });

      const updated = await regradeSubmission(sub._id.toString());
      expect(updated).toBeDefined();
      expect(updated!.score).toBe(0);
      expect(updated!.answers[1].score = 0);
    });

    it('should create a new answer doc if the old savedAnswer is not found', async () => {
      // We'll create a legit date question, add it to assessment
      const dateQ = await DateQuestionModel.create({
        text: 'Select a date',
        type: 'Date',
        isScored: false,
        order: 3,
        isRange: false,
      });
      assessment.questions.push(dateQ._id);
      await assessment.save();

      // Make a blank submission
      const sub = await SubmissionModel.create({
        assessment: assessment._id,
        user: ta._id,
        answers: [],
      });

      // Insert a "fake" doc reference for date
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
        marks: [{ marker: ta._id, submission: sub._id, score: 0 }],
      });

      const updated = await regradeSubmission(sub._id.toString());
      expect(updated).toBeDefined();
      expect(updated!.score).toBe(0); // date question is not scored
      expect(updated!.answers.length).toBe(2); // TMS + newly created date answer doc
    });

    it('should throw NotFoundError if no assessment result found for that user in that assessment', async () => {
      const teamAnsDoc = await TeamMemberSelectionAnswerModel.create({
        question: teamMemberQuestion,
        type: 'Team Member Selection Answer',
        selectedUserIds: [ta._id],
      });
      const sub = await SubmissionModel.create({
        assessment: assessment._id,
        user: ta._id,
        answers: [teamAnsDoc],
      });

      // Manually remove the result
      await AssessmentResultModel.deleteMany({
        assessment: assessment._id,
        student: ta._id,
      });

      await expect(regradeSubmission(sub._id.toString())).rejects.toThrow(
        `No assessment result found for student ${ta._id.toString()} in assessment ${assessment._id.toString()}`
      );
    });

    it('should add a new mark entry if mark entry does not exist yet', async () => {
      // We'll create a submission referencing the TA in TMS
      const fullAnswers = buildAllAnswers(assessment, ta._id.toString());
      // The TMS is index 0 => set it to TA
      (fullAnswers[0] as TeamMemberSelectionAnswer).selectedUserIds = [ta._id.toString()];

      const sub = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        fullAnswers,
        false
      );

      const resultDoc = await AssessmentResultModel.findOne({
        assessment: assessment._id,
        student: ta._id,
      });
      // Clear out marks
      resultDoc!.marks = [];
      await resultDoc!.save();

      const updated = await regradeSubmission(sub._id.toString());
      expect(updated).toBeDefined(); //Why?
      expect(updated!.score).toBeGreaterThanOrEqual(0); // might be >0 if partial is scored
      const finalResult = await AssessmentResultModel.findById(resultDoc!._id);
      expect(finalResult).toBeDefined();
      expect(finalResult!.marks.length).toBe(1);
      expect(finalResult!.marks[0].submission.toString()).toEqual(sub._id.toString());
    });
  });
});
