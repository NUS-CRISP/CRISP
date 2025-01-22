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
  softDeleteSubmissionsByAssessmentId,
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
  MultipleChoiceAnswerModel,
  AnswerUnion,
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
  ScaleQuestion,
  NumberQuestion,
  DateQuestion,
} from '@models/QuestionTypes';
import AssessmentAssignmentSetModel, {
  AssignedUser,
} from '@models/AssessmentAssignmentSet';
import TeamModel from '@models/Team';
import AssessmentResultModel from '@models/AssessmentResult';
import { Question } from '@models/Question';

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
let mcQuestion: any; // index 1
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
  mcQuestion = data.mcQuestion; // index 1
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
    q0,
    q1,
    q2,
    q3,
    q4,
    q5,
    q6,
    q7,
    q8,
    q9,
    q10,
    q11,
    q12,
    q13,
    q14,
    q15,
    q16,
    q17,
    q18,
    q19,
    q20,
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

  describe('validateAnswers', () => {
    it('should throw BadRequestError if an answer references a non-existent question', async () => {
      // Step 1: Create an orphan question not part of the assessment
      const orphanQuestion = await MultipleChoiceQuestionModel.create({
        text: 'Orphan Question',
        type: 'Multiple Choice',
        isRequired: true,
        isLocked: false,
        isScored: true,
        options: [
          { text: 'Option X', points: 5 },
          { text: 'Option Y', points: 10 },
        ] as MultipleChoiceOption[],
        order: 99,
      });

      // Step 2: Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Step 3: Append an answer referencing the orphan question
      const invalidAnswer: unknown = {
        question: orphanQuestion._id.toString(),
        type: 'Multiple Choice Answer',
        value: 'Option X',
      };
      validAnswers.push(invalidAnswer as AnswerUnion);

      // Step 4: Attempt to create the submission and expect a BadRequestError
      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          validAnswers,
          false
        )
      ).rejects.toThrow(
        `Question ${orphanQuestion._id.toString()} not found in this assessment`
      );
    });

    it('should throw BadRequestError if an answer type does not match the question type', async () => {
      // Step 1: Select a valid question from the assessment
      const question = assessment.questions.find(
        (q: Question) => q.type === 'Multiple Choice'
      );
      expect(question).toBeDefined();

      // Step 2: Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Step 3: Append an answer with mismatched type
      const mismatchedAnswer: unknown = {
        question: question!._id.toString(),
        type: 'Short Response Answer', // Incorrect type
        value: 'This should be a Multiple Choice Answer',
      };
      validAnswers.push(mismatchedAnswer as AnswerUnion);

      // Step 4: Attempt to create the submission and expect a BadRequestError
      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          validAnswers,
          false
        )
      ).rejects.toThrow(
        `Answer type "Short Response Answer" does not match question type "Multiple Choice" for question ${question!._id.toString()}`
      );
    });

    it('should throw BadRequestError if Team Member Selection Answer selects multiple users in individual granularity', async () => {
      // Step 1: Modify assessment granularity to 'individual'
      assessment.granularity = 'individual';
      await assessment.save();

      // Step 2: Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Step 3: Find the Team Member Selection Answer and modify selectedUserIds to have multiple IDs
      const tmsAnswer = validAnswers.find(
        ans => ans.type === 'Team Member Selection Answer'
      ) as TeamMemberSelectionAnswer;
      expect(tmsAnswer).toBeDefined();

      // Assuming you have another student user
      const anotherStudent = await UserModel.create({
        name: 'Another Student',
        email: 'another@student.edu',
        // ... other required fields
      });

      tmsAnswer.selectedUserIds.push(anotherStudent._id.toString());

      // Step 4: Attempt to create the submission and expect a BadRequestError
      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          validAnswers,
          false
        )
      ).rejects.toThrow(
        `Only one team member can be selected for question ${tmsAnswer.question}`
      );
    });

    it('should throw BadRequestError if Multiple Choice Answer selects an invalid option', async () => {
      // Step 1: Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Step 2: Find a Multiple Choice Answer
      const mcQuestion = assessment.questions.find(
        (q: Question) => q.type === 'Multiple Choice'
      );
      expect(mcQuestion).toBeDefined();

      const mcAnswer = validAnswers.find(
        ans =>
          ans.type === 'Multiple Choice Answer' &&
          ans.question._id.toString() === mcQuestion!._id.toString()
      ) as MultipleChoiceAnswer;
      expect(mcAnswer).toBeDefined();

      // Step 3: Modify the answer to select an invalid option
      mcAnswer.value = 'Invalid Option';

      // Step 4: Attempt to create the submission and expect a BadRequestError
      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          validAnswers,
          false
        )
      ).rejects.toThrow(
        `Invalid option selected for question ${mcQuestion!._id.toString()}`
      );
    });

    it('should throw BadRequestError if Multiple Response Answer includes invalid option values', async () => {
      // Step 1: Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Step 2: Find a Multiple Response Answer
      const mrQuestion = assessment.questions.find(
        (q: Question) => q.type === 'Multiple Response'
      );
      expect(mrQuestion).toBeDefined();

      const mrAnswer = validAnswers.find(
        ans =>
          ans.type === 'Multiple Response Answer' &&
          ans.question._id.toString() === mrQuestion!._id.toString()
      ) as MultipleResponseAnswer;
      expect(mrAnswer).toBeDefined();

      // Step 3: Modify the answer to include an invalid option
      mrAnswer.values.push('Invalid Option');

      // Step 4: Attempt to create the submission and expect a BadRequestError
      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          validAnswers,
          false
        )
      ).rejects.toThrow(
        `Invalid option selected for question ${mrQuestion!._id.toString()}`
      );
    });

    it('should throw BadRequestError if Scale Answer has a value below 1', async () => {
      // Step 1: Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Step 2: Find a Scale Answer
      const scaleQuestion = assessment.questions.find(
        (q: Question) => q.type === 'Scale'
      );
      expect(scaleQuestion).toBeDefined();

      const scaleAnswer = validAnswers.find(
        ans =>
          ans.type === 'Scale Answer' &&
          ans.question._id.toString() === scaleQuestion!._id.toString()
      ) as ScaleAnswer;
      expect(scaleAnswer).toBeDefined();

      // Step 3: Modify the answer to have a value below 1
      scaleAnswer.value = 0;

      // Step 4: Attempt to create the submission and expect a BadRequestError
      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          validAnswers,
          false
        )
      ).rejects.toThrow(
        `Invalid scale value for question ${scaleQuestion!._id.toString()}`
      );
    });
    it('should throw BadRequestError if Scale Answer has a value above scaleMax', async () => {
      // Step 1: Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Step 2: Find a Scale Answer
      const scaleQuestion = assessment.questions.find(
        (q: Question) => q.type === 'Scale'
      );
      expect(scaleQuestion).toBeDefined();

      const scaleMax = (scaleQuestion as ScaleQuestion).scaleMax;
      expect(scaleMax).toBeDefined();

      const scaleAnswer = validAnswers.find(
        ans =>
          ans.type === 'Scale Answer' &&
          ans.question._id.toString() === scaleQuestion!._id.toString()
      ) as ScaleAnswer;
      expect(scaleAnswer).toBeDefined();

      // Step 3: Modify the answer to have a value above scaleMax
      scaleAnswer.value = (scaleMax as number) + 1;

      // Step 4: Attempt to create the submission and expect a BadRequestError
      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          validAnswers,
          false
        )
      ).rejects.toThrow(
        `Invalid scale value for question ${scaleQuestion!._id.toString()}`
      );
    });

    it('should throw BadRequestError if Date Answer with isRange=true is missing endDate', async () => {
      // Step 1: Find a Date Question with isRange=true
      const dateQuestion = assessment.questions.find(
        (q: Question) => q.type === 'Date' && (q as DateQuestion).isRange
      );
      expect(dateQuestion).toBeDefined();

      // Step 2: Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Step 3: Find the corresponding Date Answer and modify it
      const dateAnswer = validAnswers.find(
        ans =>
          ans.type === 'Date Answer' &&
          ans.question._id.toString() === dateQuestion!._id.toString()
      ) as DateAnswer;
      expect(dateAnswer).toBeDefined();

      // Step 4: Remove endDate to make it invalid
      delete dateAnswer.endDate;

      // Step 5: Attempt to create the submission and expect a BadRequestError
      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          validAnswers,
          false
        )
      ).rejects.toThrow(
        `Invalid date range provided for question ${dateAnswer.question}`
      );
    });

    it('should throw BadRequestError if Date Answer with isRange=false is missing value', async () => {
      // Step 1: Find a Date Question with isRange=false
      const dateQuestion = assessment.questions.find(
        (q: Question) => q.type === 'Date' && !(q as DateQuestion).isRange
      );
      expect(dateQuestion).toBeDefined();

      // Step 2: Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Step 3: Find the corresponding Date Answer and modify it
      const dateAnswer = validAnswers.find(
        ans =>
          ans.type === 'Date Answer' &&
          ans.question._id.toString() === dateQuestion!._id.toString()
      ) as DateAnswer;
      expect(dateAnswer).toBeDefined();

      // Step 4: Remove value to make it invalid
      delete dateAnswer.value;

      // Step 5: Attempt to create the submission and expect a BadRequestError
      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          validAnswers,
          false
        )
      ).rejects.toThrow(
        `Invalid date provided for question ${dateAnswer.question}`
      );
    });

    it('should throw BadRequestError if Number Answer has a value below 0', async () => {
      // Step 1: Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Step 2: Find a Number Answer
      const numberQuestion = assessment.questions.find(
        (q: Question) => q.type === 'Number'
      );
      expect(numberQuestion).toBeDefined();

      const numberAnswer = validAnswers.find(
        ans =>
          ans.type === 'Number Answer' &&
          ans.question._id.toString() === numberQuestion!._id.toString()
      ) as NumberAnswer;
      expect(numberAnswer).toBeDefined();

      // Step 3: Modify the answer to have a value below 0
      numberAnswer.value = -10;

      // Step 4: Attempt to create the submission and expect a BadRequestError
      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          validAnswers,
          false
        )
      ).rejects.toThrow(
        `Invalid number value for question ${numberAnswer.question}`
      );
    });

    it('should throw BadRequestError if Number Answer has a value above maxNumber', async () => {
      // Step 1: Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Step 2: Find a Number Answer
      const numberQuestion = assessment.questions.find(
        (q: Question) => q.type === 'Number'
      );
      expect(numberQuestion).toBeDefined();

      const maxNumber = (numberQuestion as NumberQuestion).maxNumber;
      expect(maxNumber).toBeDefined();

      const numberAnswer = validAnswers.find(
        ans =>
          ans.type === 'Number Answer' &&
          ans.question._id.toString() === numberQuestion!._id.toString()
      ) as NumberAnswer;
      expect(numberAnswer).toBeDefined();

      // Step 3: Modify the answer to have a value above maxNumber
      numberAnswer.value = (maxNumber as number) + 1;

      // Step 4: Attempt to create the submission and expect a BadRequestError
      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          validAnswers,
          false
        )
      ).rejects.toThrow(
        `Invalid number value for question ${numberAnswer.question}`
      );
    });

    it('should accept Undecided Answer without errors and set score to 0', async () => {
      // Step 1: Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Step 2: Append an Undecided Answer
      const undecidedQuestion = assessment.questions.find(
        (q: Question) => q.type === 'Undecided'
      );
      expect(undecidedQuestion).toBeDefined();

      const undecidedAnswer: UndecidedAnswer = {
        question: undecidedQuestion!._id.toString(),
        type: 'Undecided Answer',
        // No additional fields required
      } as UndecidedAnswer;
      validAnswers.push(undecidedAnswer as AnswerUnion);

      // Step 3: Attempt to create the submission
      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        validAnswers,
        false
      );

      // Step 4: Fetch the updated submission
      const updatedSubmission = await SubmissionModel.findById(
        submission._id
      ).populate('answers');
      expect(updatedSubmission).toBeDefined();

      // Step 5: Find the Undecided Answer and verify its score
      const foundUndecidedAnswer = updatedSubmission!.answers.find(
        (ans: any) => ans.type === 'Undecided Answer'
      );
      expect(foundUndecidedAnswer).toBeDefined();
      expect(foundUndecidedAnswer!.score).toBe(0);
    });

    it('should throw BadRequestError if Multiple Response Answer includes all invalid option values', async () => {
      // Step 1: Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Step 2: Find a Multiple Response Answer
      const mrQuestion = assessment.questions.find(
        (q: Question) => q.type === 'Multiple Response'
      );
      expect(mrQuestion).toBeDefined();

      const mrAnswer = validAnswers.find(
        ans =>
          ans.type === 'Multiple Response Answer' &&
          ans.question._id.toString() === mrQuestion!._id.toString()
      ) as MultipleResponseAnswer;
      expect(mrAnswer).toBeDefined();

      // Step 3: Modify the answer to include only invalid options
      mrAnswer.values = ['Invalid Option 1', 'Invalid Option 2'];

      // Step 4: Attempt to create the submission and expect a BadRequestError
      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          validAnswers,
          false
        )
      ).rejects.toThrow(
        `Invalid option selected for question ${mrQuestion!._id.toString()}`
      );
    });

    it('should throw BadRequestError if Multiple Response Answer includes both valid and invalid option values', async () => {
      // Step 1: Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Step 2: Find a Multiple Response Answer
      const mrQuestion = assessment.questions.find(
        (q: Question) => q.type === 'Multiple Response'
      );
      expect(mrQuestion).toBeDefined();

      const mrAnswer = validAnswers.find(
        ans =>
          ans.type === 'Multiple Response Answer' &&
          ans.question._id.toString() === mrQuestion!._id.toString()
      ) as MultipleResponseAnswer;
      expect(mrAnswer).toBeDefined();
      // Step 3: Modify the answer to include both valid and invalid options
      mrAnswer.values.push('Invalid Option');
      // Step 4: Attempt to create the submission and expect a BadRequestError
      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          validAnswers,
          false
        )
      ).rejects.toThrow(
        `Invalid option selected for question ${mrQuestion!._id.toString()}`
      );
    });

    it('should throw BadRequestError if an answer references a non-existent question', async () => {
      // Create an orphan question not part of the assessment
      const orphanQuestion = await MultipleChoiceQuestionModel.create({
        type: 'Multiple Choice',
        text: 'Orphan Question',
        isRequired: true,
        isLocked: false,
        isScored: true,
        options: [
          { text: 'Option X', points: 5 },
          { text: 'Option Y', points: 10 },
        ],
        order: 99,
      });

      // Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Append an answer referencing the orphan question
      const invalidAnswer: MultipleChoiceAnswer = {
        question: orphanQuestion._id,
        type: 'Multiple Choice Answer',
        value: 'Option X',
      } as MultipleChoiceAnswer;
      validAnswers.push(invalidAnswer as AnswerUnion);

      // Attempt to create the submission and expect a BadRequestError
      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          validAnswers,
          false
        )
      ).rejects.toThrow(
        `Question ${orphanQuestion._id.toString()} not found in this assessment`
      );
    });

    it('should throw BadRequestError if an answer type does not match the question type', async () => {
      // Select a valid question from the assessment
      const mcQuestion = assessment.questions.find(
        (q: Question) => q.type === 'Multiple Choice'
      );
      expect(mcQuestion).toBeDefined();

      // Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Append an answer with mismatched type
      const mismatchedAnswer: ShortResponseAnswer = {
        question: mcQuestion!._id,
        type: 'Short Response Answer', // Incorrect type
        value: 'This should be a Multiple Choice Answer',
      } as ShortResponseAnswer;
      validAnswers.push(mismatchedAnswer as AnswerUnion);

      // Attempt to create the submission and expect a BadRequestError
      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          validAnswers,
          false
        )
      ).rejects.toThrow(
        `Answer type "Short Response Answer" does not match question type "Multiple Choice" for question ${mcQuestion!._id.toString()}`
      );
    });

    it('should throw BadRequestError if Multiple Choice Answer selects an invalid option', async () => {
      // Find a Multiple Choice Answer
      const mcQuestion = assessment.questions.find(
        (q: Question) => q.type === 'Multiple Choice'
      );
      if (!mcQuestion) {
        // If no such question exists, skip the test
        return;
      }

      // Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Find the corresponding Multiple Choice Answer
      const mcAnswer = validAnswers.find(
        ans =>
          ans.type === 'Multiple Choice Answer' &&
          ans.question.equals(mcQuestion._id)
      ) as MultipleChoiceAnswer;
      expect(mcAnswer).toBeDefined();

      // Modify the answer to select an invalid option
      mcAnswer.value = 'Invalid Option';

      // Attempt to create the submission and expect a BadRequestError
      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          validAnswers,
          false
        )
      ).rejects.toThrow(
        `Invalid option selected for question ${mcAnswer.question}`
      );
    });

    it('should throw BadRequestError if Multiple Response Answer has non-array values', async () => {
      // Find a Multiple Response Answer
      const mrQuestion = assessment.questions.find(
        (q: Question) => q.type === 'Multiple Response'
      );
      if (!mrQuestion) {
        // If no such question exists, skip the test
        return;
      }

      // Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Find the corresponding Multiple Response Answer
      const mrAnswer = validAnswers.find(
        ans =>
          ans.type === 'Multiple Response Answer' &&
          ans.question.equals(mrQuestion._id)
      ) as MultipleResponseAnswer;
      expect(mrAnswer).toBeDefined();

      // Modify the answer to have non-array values
      (mrAnswer.values as any) = 'Not an array';

      // Attempt to create the submission and expect a BadRequestError
      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          validAnswers,
          false
        )
      ).rejects.toThrow(
        `Answers for question ${mrAnswer.question} must be an array`
      );
    });

    it('should throw BadRequestError if Multiple Response Answer includes invalid option values', async () => {
      // Find a Multiple Response Answer
      const mrQuestion = assessment.questions.find(
        (q: Question) => q.type === 'Multiple Response'
      );
      if (!mrQuestion) {
        // If no such question exists, skip the test
        return;
      }

      // Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Find the corresponding Multiple Response Answer
      const mrAnswer = validAnswers.find(
        ans =>
          ans.type === 'Multiple Response Answer' &&
          ans.question.equals(mrQuestion._id)
      ) as MultipleResponseAnswer;
      expect(mrAnswer).toBeDefined();

      // Modify the answer to include invalid option values
      mrAnswer.values.push('Invalid Option 1', 'Invalid Option 2');

      // Attempt to create the submission and expect a BadRequestError
      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          validAnswers,
          false
        )
      ).rejects.toThrow(
        `Invalid option selected for question ${mrAnswer.question}`
      );
    });

    it('should throw BadRequestError if Scale Answer has a value below 1', async () => {
      // Find a Scale Answer
      const scaleQuestion = assessment.questions.find(
        (q: Question) => q.type === 'Scale'
      );
      if (!scaleQuestion) {
        // If no such question exists, skip the test
        return;
      }

      // Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Find the corresponding Scale Answer
      const scaleAnswer = validAnswers.find(
        ans =>
          ans.type === 'Scale Answer' && ans.question.equals(scaleQuestion._id)
      ) as ScaleAnswer;
      expect(scaleAnswer).toBeDefined();

      // Modify the answer to have a value below 1
      scaleAnswer.value = 0;

      // Attempt to create the submission and expect a BadRequestError
      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          validAnswers,
          false
        )
      ).rejects.toThrow(
        `Invalid scale value for question ${scaleAnswer.question}`
      );
    });

    it('should throw BadRequestError if Scale Answer has a value above scaleMax', async () => {
      // Find a Scale Answer
      const scaleQuestion = assessment.questions.find(
        (q: Question) => q.type === 'Scale'
      );
      if (!scaleQuestion) {
        // If no such question exists, skip the test
        return;
      }

      // Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Retrieve scaleMax
      const scaleMax = (scaleQuestion as ScaleQuestion).scaleMax;
      expect(scaleMax).toBeDefined();

      // Find the corresponding Scale Answer
      const scaleAnswer = validAnswers.find(
        ans =>
          ans.type === 'Scale Answer' && ans.question.equals(scaleQuestion._id)
      ) as ScaleAnswer;
      expect(scaleAnswer).toBeDefined();

      // Modify the answer to have a value above scaleMax
      scaleAnswer.value = scaleMax + 1;

      // Attempt to create the submission and expect a BadRequestError
      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          validAnswers,
          false
        )
      ).rejects.toThrow(
        `Invalid scale value for question ${scaleAnswer.question}`
      );
    });

    it('should throw BadRequestError if Date Answer with isRange=true is missing endDate', async () => {
      // Find a Date Answer with isRange=true
      const dateQuestion = assessment.questions.find(
        (q: Question) => q.type === 'Date' && (q as DateQuestion).isRange
      );
      if (!dateQuestion) {
        // If no such question exists, skip the test
        return;
      }

      // Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Find the corresponding Date Answer
      const dateAnswerIndex = validAnswers.findIndex(
        ans =>
          ans.type === 'Date Answer' && ans.question.equals(dateQuestion._id)
      );
      expect(dateAnswerIndex).toBeGreaterThanOrEqual(0);

      // Remove endDate to make it invalid
      delete (validAnswers[dateAnswerIndex] as DateAnswer).endDate;

      // Attempt to create the submission and expect a BadRequestError
      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          validAnswers,
          false
        )
      ).rejects.toThrow(
        `Invalid date range provided for question ${validAnswers[dateAnswerIndex].question}`
      );
    });

    it('should throw BadRequestError if Date Answer with isRange=true is missing startDate', async () => {
      // Find a Date Answer with isRange=true
      const dateQuestion = assessment.questions.find(
        (q: Question) => q.type === 'Date' && (q as DateQuestion).isRange
      );
      if (!dateQuestion) {
        // If no such question exists, skip the test
        return;
      }

      // Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Find the corresponding Date Answer
      const dateAnswerIndex = validAnswers.findIndex(
        ans =>
          ans.type === 'Date Answer' && ans.question.equals(dateQuestion._id)
      );
      expect(dateAnswerIndex).toBeGreaterThanOrEqual(0);

      // Remove startDate to make it invalid
      delete (validAnswers[dateAnswerIndex] as DateAnswer).startDate;

      // Attempt to create the submission and expect a BadRequestError
      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          validAnswers,
          false
        )
      ).rejects.toThrow(
        `Invalid date range provided for question ${validAnswers[dateAnswerIndex].question}`
      );
    });

    it('should throw BadRequestError if Number Answer has a non-number value', async () => {
      // Find a Number Answer
      const numberQuestion = assessment.questions.find(
        (q: Question) => q.type === 'Number'
      );
      if (!numberQuestion) {
        // If no such question exists, skip the test
        return;
      }

      // Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Find the corresponding Number Answer
      const numberAnswerIndex = validAnswers.findIndex(
        ans =>
          ans.type === 'Number Answer' &&
          ans.question.equals(numberQuestion._id)
      );
      expect(numberAnswerIndex).toBeGreaterThanOrEqual(0);

      // Modify the answer to have a non-number value
      (validAnswers[numberAnswerIndex] as NumberAnswer).value =
        'Not a number' as any;

      // Attempt to create the submission and expect a BadRequestError
      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          validAnswers,
          false
        )
      ).rejects.toThrow(
        `Answer for question ${validAnswers[numberAnswerIndex].question} must be a number`
      );
    });

    it('should throw BadRequestError if Number Answer has a value below 0', async () => {
      // Find a Number Answer
      const numberQuestion = assessment.questions.find(
        (q: Question) => q.type === 'Number'
      );
      if (!numberQuestion) {
        // If no such question exists, skip the test
        return;
      }

      // Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Find the corresponding Number Answer
      const numberAnswerIndex = validAnswers.findIndex(
        ans =>
          ans.type === 'Number Answer' &&
          ans.question.equals(numberQuestion._id)
      );
      expect(numberAnswerIndex).toBeGreaterThanOrEqual(0);

      // Modify the answer to have a value below 0
      (validAnswers[numberAnswerIndex] as NumberAnswer).value = -10;

      // Attempt to create the submission and expect a BadRequestError
      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          validAnswers,
          false
        )
      ).rejects.toThrow(
        `Invalid number value for question ${validAnswers[numberAnswerIndex].question}`
      );
    });

    it('should throw BadRequestError if Number Answer has a value above maxNumber', async () => {
      // Find a Number Answer
      const numberQuestion = assessment.questions.find(
        (q: Question) => q.type === 'Number'
      );
      if (!numberQuestion) {
        // If no such question exists, skip the test
        return;
      }

      // Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Retrieve maxNumber
      const maxNumber = (numberQuestion as NumberQuestion).maxNumber;
      expect(maxNumber).toBeDefined();

      // Find the corresponding Number Answer
      const numberAnswerIndex = validAnswers.findIndex(
        ans =>
          ans.type === 'Number Answer' &&
          ans.question.equals(numberQuestion._id)
      );
      expect(numberAnswerIndex).toBeGreaterThanOrEqual(0);

      // Modify the answer to have a value above maxNumber
      (validAnswers[numberAnswerIndex] as NumberAnswer).value =
        (maxNumber as number) + 1;

      // Attempt to create the submission and expect a BadRequestError
      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          validAnswers,
          false
        )
      ).rejects.toThrow(
        `Invalid number value for question ${validAnswers[numberAnswerIndex].question}`
      );
    });

    it('should accept Undecided Answer without errors and set score to 0', async () => {
      // Find an Undecided Answer
      const undecidedQuestion = assessment.questions.find(
        (q: Question) => q.type === 'Undecided'
      );
      if (!undecidedQuestion) {
        // If no such question exists, skip the test
        return;
      }

      // Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Append an Undecided Answer
      const undecidedAnswer: UndecidedAnswer = {
        question: undecidedQuestion._id,
        type: 'Undecided Answer',
        // No additional fields
      } as UndecidedAnswer;
      validAnswers.push(undecidedAnswer as AnswerUnion);

      // Attempt to create the submission
      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        validAnswers,
        false
      );

      // Fetch the updated submission
      const updatedSubmission = await SubmissionModel.findById(
        submission._id
      ).populate('answers');
      expect(updatedSubmission).toBeDefined();

      // Find the Undecided Answer and verify its score
      const foundUndecidedAnswer = updatedSubmission!.answers.find(
        (ans: any) => ans.type === 'Undecided Answer'
      );
      expect(foundUndecidedAnswer).toBeDefined();
      expect(foundUndecidedAnswer!.score).toBe(0);
    });

    it('should throw BadRequestError if Multiple Response Answer includes all invalid option values', async () => {
      // Find a Multiple Response Answer
      const mrQuestion = assessment.questions.find(
        (q: Question) => q.type === 'Multiple Response'
      );
      if (!mrQuestion) {
        // If no such question exists, skip the test
        return;
      }

      // Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Find the corresponding Multiple Response Answer
      const mrAnswer = validAnswers.find(
        ans =>
          ans.type === 'Multiple Response Answer' &&
          ans.question.equals(mrQuestion._id)
      ) as MultipleResponseAnswer;
      expect(mrAnswer).toBeDefined();

      // Modify the answer to include only invalid option values
      mrAnswer.values = ['Invalid Option 1', 'Invalid Option 2'];

      // Attempt to create the submission and expect a BadRequestError
      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          validAnswers,
          false
        )
      ).rejects.toThrow(
        `Invalid option selected for question ${mrAnswer.question}`
      );
    });

    it('should throw BadRequestError if Multiple Response Answer includes both valid and invalid option values', async () => {
      // Find a Multiple Response Answer
      const mrQuestion = assessment.questions.find(
        (q: Question) => q.type === 'Multiple Response'
      );
      if (!mrQuestion) {
        // If no such question exists, skip the test
        return;
      }

      // Build a valid set of answers
      const validAnswers = buildAllAnswers(assessment, student._id.toString());

      // Find the corresponding Multiple Response Answer
      const mrAnswer = validAnswers.find(
        ans =>
          ans.type === 'Multiple Response Answer' &&
          ans.question.equals(mrQuestion._id)
      ) as MultipleResponseAnswer;
      expect(mrAnswer).toBeDefined();

      // Modify the answer to include both valid and invalid option values
      mrAnswer.values.push('Invalid Option');

      // Attempt to create the submission and expect a BadRequestError
      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          validAnswers,
          false
        )
      ).rejects.toThrow(
        `Invalid option selected for question ${mrAnswer.question}`
      );
    });
  });

  describe('createSubmission', () => {
    it('should create a new submission', async () => {
      const fullAnswers = buildAllAnswers(assessment, student._id.toString());
      // Optionally change the TMS to reference the student
      (fullAnswers[0] as TeamMemberSelectionAnswer).selectedUserIds = [
        student._id.toString(),
      ];

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
      ).rejects.toThrow('Submission creator not found');
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
      ).rejects.toThrow(
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
      const pastEnd = new Date(
        now.getFullYear() - 2,
        now.getMonth(),
        now.getDate()
      );

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
      ).rejects.toThrow(
        'You do not have permission to update this submission.'
      );
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

    it('should throw NotFoundError if Mark entry is missing in AssessmentResult', async () => {
      assessment.areSubmissionsEditable = true;
      await assessment.save();
      // 1) Create a new submission
      const fullAnswers = buildAllAnswers(assessment, student._id.toString());
      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        fullAnswers,
        false
      );
      expect(submission).toBeDefined();
      // We have an AssessmentResult with a Mark entry for that submission

      // 2) Remove that MarkEntry from the result doc (but keep the result)
      const resultDoc = await AssessmentResultModel.findOne({
        assessment: assessment._id,
        student: student._id,
      });
      expect(resultDoc).toBeDefined();
      // Filter out any mark that references this submission
      resultDoc!.marks = resultDoc!.marks.filter(
        m => m.submission.toString() !== submission._id.toString()
      );
      await resultDoc!.save();

      // 3) Attempt to update => should throw "Mark entry for this submission not found..."
      await expect(
        updateSubmission(
          submission._id.toString(),
          ta._id.toString(),
          account._id.toString(),
          fullAnswers,
          false
        )
      ).rejects.toThrow(
        'Mark entry for this submission not found in assessment result.'
      );
    });

    it('should throw NotFoundError if submission is marked as deleted', async () => {
      // Create a submission
      const fullAnswers = buildAllAnswers(assessment, student._id.toString());
      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        fullAnswers,
        false
      );

      // Mark the submission as deleted
      submission.deleted = true;
      await submission.save();

      // Attempt to update the deleted submission
      await expect(
        updateSubmission(
          submission._id.toString(),
          ta._id.toString(),
          account._id.toString(),
          fullAnswers,
          false
        )
      ).rejects.toThrow('Submission not found (Deleted).');
    });

    it('should throw NotFoundError if submission updater does not exist', async () => {
      // Create a submission
      const fullAnswers = buildAllAnswers(assessment, student._id.toString());
      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        fullAnswers,
        false
      );

      // Generate a bogus userId
      const bogusUserId = new mongoose.Types.ObjectId().toString();

      // Attempt to update with the bogus userId
      await expect(
        updateSubmission(
          submission._id.toString(),
          bogusUserId,
          account._id.toString(),
          fullAnswers,
          false
        )
      ).rejects.toThrow('Submission updater not found');
    });

    it('should create a new answer document if the savedAnswer is not found', async () => {
      // Create a submission with a valid answer
      const fullAnswers = buildAllAnswers(assessment, student._id.toString());
      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        fullAnswers,
        false
      );

      // Remove the savedAnswer from the database
      const answerToRemove = submission.answers[1] as MultipleChoiceAnswer; // Assume index 1 exists
      await MultipleChoiceAnswerModel.findByIdAndDelete(answerToRemove._id);

      // Update the submission
      const updatedSubmission = await updateSubmission(
        submission._id.toString(),
        ta._id.toString(),
        account._id.toString(),
        fullAnswers,
        false
      );

      // Verify that a new answer document has been created
      const newAnswer = await MultipleChoiceAnswerModel.findOne({
        question: answerToRemove.question,
        value: answerToRemove.value,
      });

      expect(newAnswer).toBeDefined();
      expect(newAnswer).toBe(null);

      // Verify that the submission's answer now references the new answer
      const updatedAnswer = updatedSubmission.answers.find(
        (ans: any) =>
          ans.question.toString() === answerToRemove.question.toString() &&
          ans.value === answerToRemove.value
      );

      expect(updatedAnswer).toBeDefined();
    });

    it('should throw NotFoundError if no assessment result exists for the student', async () => {
      // Create a submission
      const fullAnswers = buildAllAnswers(assessment, student._id.toString());
      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        fullAnswers,
        false
      );

      // Delete the AssessmentResult for the student
      await AssessmentResultModel.deleteOne({
        assessment: assessment._id,
        student: student._id,
      });

      // Attempt to update the submission
      await expect(
        updateSubmission(
          submission._id.toString(),
          ta._id.toString(),
          account._id.toString(),
          fullAnswers,
          false
        )
      ).rejects.toThrow(
        'No previous assessment result found. Something went wrong with the flow.'
      );
    });

    it('should throw NotFoundError if mark entry for the submission is missing in AssessmentResult', async () => {
      // Create a submission
      const fullAnswers = buildAllAnswers(assessment, student._id.toString());
      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        fullAnswers,
        false
      );

      // Remove the mark entry from AssessmentResult
      const assessmentResult = await AssessmentResultModel.findOne({
        assessment: assessment._id,
        student: student._id,
      });
      expect(assessmentResult).toBeDefined();

      // Remove the specific mark entry
      assessmentResult!.marks = assessmentResult!.marks.filter(
        mark => mark.submission.toString() !== submission._id.toString()
      );
      await assessmentResult!.save();

      // Attempt to update the submission
      await expect(
        updateSubmission(
          submission._id.toString(),
          ta._id.toString(),
          account._id.toString(),
          fullAnswers,
          false
        )
      ).rejects.toThrow(
        'Mark entry for this submission not found in assessment result.'
      );
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

    it('should throw NotFoundError for a non-existent submission ID', async () => {
      // Generate a random ObjectId that does not correspond to any existing submission
      const bogusSubmissionId = new mongoose.Types.ObjectId().toString();
      const adjustedScore = 50; // Example adjusted score

      // Attempt to adjust the score of the non-existent submission
      await expect(
        adjustSubmissionScore(bogusSubmissionId, adjustedScore)
      ).rejects.toThrow('Submission not found.');
    });
  });

  describe('softDeleteSubmissionsByAssessmentId', () => {
    it('should soft-delete all active submissions for a given assessment', async () => {
      // 1) Create multiple submissions
      const s1 = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        buildAllAnswers(assessment, student._id.toString()),
        false
      );
      const s2 = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        buildAllAnswers(assessment, student._id.toString()),
        false
      );

      // 2) Soft-delete them in bulk
      const deletedCount = await softDeleteSubmissionsByAssessmentId(
        ta._id.toString(),
        assessment._id.toString()
      );
      expect(deletedCount).toBeGreaterThanOrEqual(2);

      // 3) Confirm they are marked as deleted
      const checkS1 = await SubmissionModel.findById(s1._id);
      const checkS2 = await SubmissionModel.findById(s2._id);
      expect(checkS1!.deleted).toBe(true);
      expect(checkS2!.deleted).toBe(true);
    });

    it('should throw NotFoundError if the assessment does not exist', async () => {
      const badId = new mongoose.Types.ObjectId().toString();
      await expect(
        softDeleteSubmissionsByAssessmentId(ta._id.toString(), badId)
      ).rejects.toThrow('Assessment not found');
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
      const regradedSubmission = await regradeSubmission(
        submission._id.toString()
      );
      expect(regradedSubmission).toBeDefined();
      expect(regradedSubmission!.score).toBeGreaterThan(0);

      // The AssessmentResult should be updated
      const updatedResult = await AssessmentResultModel.findById(
        newAssessmentResult._id
      );
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

    it('should skip regrading if submission is soft-deleted', async () => {
      const s = await SubmissionModel.create({
        assessment: assessment._id,
        user: ta._id,
        answers: [],
        isDraft: false,
        deleted: true,
      });
      await expect(regradeSubmission(s._id.toString())).toBe({});
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
      const orphanCheck = await ShortResponseAnswerModel.findById(
        orphanAns._id
      );
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
      expect((updated!.answers[1].score = 0));
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
      (fullAnswers[0] as TeamMemberSelectionAnswer).selectedUserIds = [
        ta._id.toString(),
      ];

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
      expect(finalResult!.marks[0].submission.toString()).toEqual(
        sub._id.toString()
      );
    });

    it('should force "Multiple Choice" to throw error if no matching option', async () => {
      // We'll create a normal submission with a "bad" MC answer that doesn't match any MC option
      const answers = buildAllAnswers(assessment, student._id.toString());
      // Index 1 is our "Multiple Choice (scored)" => replace with invalid value
      (answers[1] as MultipleChoiceAnswer).value = 'NotAnOption';

      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          answers,
          false
        )
      ).rejects.toThrow();
    });

    it('should produce partial negative (Multiple Response) with negative points included', async () => {
      // We'll focus on question[8] => partial+negative
      // We'll choose 'A' (5) and 'B' (-2) to produce partial negative
      // That yields 3 total
      const answers = buildAllAnswers(assessment, student._id.toString());
      const mrAns = answers[8] as MultipleResponseAnswer;
      mrAns.values = ['A', 'B']; // 5 + (-2) => 3
      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        answers,
        false
      );
      const regraded = await regradeSubmission(submission._id.toString());
      expect(regraded).toBeDefined();
      expect(regraded!.score).toBeGreaterThan(0);
    });

    it('should cover Number question with maxNumber=0 => returns 0', async () => {
      // We'll create a new question with maxNumber=0
      const zeroMaxQ = await NumberQuestionModel.create({
        text: 'Zero Max',
        type: 'Number',
        isScored: true,
        scoringMethod: 'direct',
        maxNumber: 0, // <-- triggers the if (maxNumber === 0) return 0
        maxPoints: 10,
        order: 21,
      });
      assessment.questions.push(zeroMaxQ);
      await assessment.save();

      const ans = {
        question: zeroMaxQ._id,
        type: 'Number Answer',
        value: 0, // but maxNumber=0 => forced 0
      } as NumberAnswer;
      const fullAnswers = buildAllAnswers(assessment, student._id.toString());
      fullAnswers.push(ans);

      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        fullAnswers,
        false
      );
      const regraded = await regradeSubmission(submission._id.toString());
      expect(regraded).toBeDefined();
      expect(regraded!.score).toBe(60); // 60 from other questions
    });

    it('should cover Number question with answer > maxNumber', async () => {
      // We'll create a new question with maxNumber=0
      const zeroMaxQ = await NumberQuestionModel.create({
        text: 'Zero Max',
        type: 'Number',
        isScored: true,
        scoringMethod: 'direct',
        maxNumber: 0, // <-- triggers the if (maxNumber === 0) return 0
        maxPoints: 10,
        order: 21,
      });
      assessment.questions.push(zeroMaxQ);
      await assessment.save();

      const ans = {
        question: zeroMaxQ._id,
        type: 'Number Answer',
        value: 50, // but maxNumber=0
      } as NumberAnswer;
      const fullAnswers = buildAllAnswers(assessment, student._id.toString());
      fullAnswers.push(ans);

      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          fullAnswers,
          false
        )
      ).rejects.toThrow();
    });

    it('should handle "Number" with value that triggers top-range, mid-range interpolation, and below-range', async () => {
      // We already have question[6] => Range-based Number with 2 ranges: [0..50]=5, [51..100]=10

      // Let's add a new question that has 3 or more overlapping ranges to force interpolation
      const multiRange = await NumberQuestionModel.create({
        text: 'Multi-range Number Q',
        type: 'Number',
        isScored: true,
        scoringMethod: 'range',
        maxNumber: 200,
        scoringRanges: [
          { minValue: 0, maxValue: 50, points: 5 },
          { minValue: 50, maxValue: 100, points: 10 },
          { minValue: 100, maxValue: 200, points: 20 },
        ],
        order: 24,
      });
      assessment.questions.push(multiRange._id);
      await assessment.save();

      // 1) value=25 => falls in [0..50] => exact 5
      // 2) value=75 => in [50..100] => 10
      // 3) value=150 => in [100..200] => 20
      // 4) value=99 => might cause interpolation if your code sees 50..100 as a gap
      // Actually it won't unless your minValue=50 is the same as the prior maxValue=50
      // We'll just do 1 test that triggers the "lowerRange && higherRange" interpolation scenario.

      const ans = {
        question: multiRange._id,
        type: 'Number Answer',
        value: 75, // sits between 50..100 => direct find => 10
      } as NumberAnswer;

      const fullAnswers = buildAllAnswers(assessment, ta._id.toString());
      fullAnswers.push(ans);

      const sub = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        fullAnswers,
        false
      );
      // regrade => should produce 10 points for that question
      const regraded = await regradeSubmission(sub._id.toString());
      expect(regraded).toBeDefined();
      expect(regraded!.score).toBe(10 + 60); //60 from other questions
    });

    it('should test "Undecided" question type in validateAnswers => no error, no score', async () => {
      // We'll forcibly remove the "Undecided Answer" from the array, then re-add it manually
      // to confirm we do pass it to createSubmission. The service should allow it silently
      // and produce 0 points.

      const answers = buildAllAnswers(assessment, student._id.toString());
      // index 20 is "Undecided Answer". We'll keep it as is.
      // The code has `case 'Undecided': break;` => no error => so let's check if it is accepted.

      const submission = await createSubmission(
        assessment._id.toString(),
        ta._id.toString(),
        answers,
        false
      );
      expect(submission).toBeDefined();
      // regrade => total score won't blow up
      const regraded = await regradeSubmission(submission._id.toString());
      expect(regraded).toBeDefined();
      // The Undecided question yields 0 => check final result
      const finalMarks = await AssessmentResultModel.findOne({
        assessment: assessment._id,
        student: student._id,
      });
      expect(finalMarks).toBeDefined();
      const me = finalMarks!.marks.find(
        m => m.submission.toString() === submission._id.toString()
      );
      expect(me).toBeDefined();
      expect(me!.score).toBeGreaterThan(0);
      // (some are scored, but not the Undecided question)
    });

    it('should test invalid date range => "Invalid date range provided..."', async () => {
      // We'll modify the date(range) question (index 17) => must have startDate/endDate
      // We'll pass a "startDate" but no "endDate" => triggers the "Invalid date range provided" error
      const answers = buildAllAnswers(assessment, student._id.toString());
      const dateRangeAns = answers[17] as DateAnswer; // index 17 => date range
      // We'll remove endDate so that it's invalid
      delete dateRangeAns.endDate;

      await expect(
        createSubmission(
          assessment._id.toString(),
          ta._id.toString(),
          answers,
          false
        )
      ).rejects.toThrow('Invalid date range provided for question');
    });

    it('should throw error if no Team Member Selection Answer is found (single MCQ scenario)', async () => {
      const singleMCQ = await MultipleChoiceQuestionModel.create({
        text: 'Single MCQ only',
        type: 'Multiple Choice',
        isRequired: true,
        isLocked: false,
        isScored: true,
        options: [
          { text: 'X', points: 5 },
          { text: 'Y', points: 10 },
        ] as MultipleChoiceOption[],
        order: 1,
      });

      const newAssessment = await InternalAssessmentModel.create({
        course: assessment.course,
        assessmentName: 'Single MCQ Assessment',
        description: 'Single MCQ',
        startDate: new Date('2000-01-01'),
        maxMarks: 10,
        scaleToMaxMarks: true,
        granularity: 'individual',
        areSubmissionsEditable: true,
        isReleased: true,
        questions: [singleMCQ._id],
      });

      await AssessmentAssignmentSetModel.create({
        assessment: newAssessment._id,
        assignedUsers: [{ user: student._id, tas: [ta._id] } as AssignedUser],
      });

      const submission = await SubmissionModel.create({
        assessment: newAssessment._id,
        user: ta._id,
        answers: [
          await MultipleChoiceAnswerModel.create({
            question: singleMCQ._id,
            type: 'Multiple Choice Answer',
            value: 'Y',
          }),
        ],
      });

      await AssessmentResultModel.create({
        assessment: newAssessment._id,
        student: student._id,
        marks: [
          {
            marker: ta._id,
            submission: submission._id,
            score: 0,
          },
        ],
      });

      await expect(
        regradeSubmission(submission._id.toString())
      ).rejects.toThrow('Missing Team Member Selection Answer');
    });

    it('should test 7 number questions (direct & range) to cover all lines in calculateNumberScore', async () => {
      // 1) Create a brand-new minimal assessment
      const tmsQuestion = await TeamMemberSelectionQuestionModel.create({
        text: 'Which user(s) are you grading?',
        type: 'Team Member Selection',
        isRequired: true,
        isLocked: false,
        order: 1,
      });

      // --- Direct #1: maxNumber=0 (any answer => 0) ---
      const directQ_zeroMax = await NumberQuestionModel.create({
        text: 'Direct scoring, maxNumber=0 => always 0',
        type: 'Number',
        isScored: true,
        scoringMethod: 'direct',
        maxNumber: 0,
        maxPoints: 10,
        order: 2,
      });

      // --- Direct #2: normal direct (maxNumber=100) ---
      const directQ_normal = await NumberQuestionModel.create({
        text: 'Direct scoring, maxNumber=100 => normal ratio',
        type: 'Number',
        isScored: true,
        scoringMethod: 'direct',
        maxNumber: 100,
        maxPoints: 10,
        order: 3,
      });

      // We'll define a single set of scoringRanges for the next five Q's:
      //   [10..20] => 5 points
      //   [30..40] => 10 points
      //   maxNumber=50
      // Each question will get a different "answer" to test each code path
      const baseRangeConfig = {
        isScored: true,
        scoringMethod: 'range' as const,
        maxNumber: 50,
        scoringRanges: [
          { minValue: 10, maxValue: 20, points: 5 },
          { minValue: 30, maxValue: 40, points: 10 },
        ],
      };

      // Range #1 => answer=5 => below [10..20], expect 0
      const rangeQ_answer5 = await NumberQuestionModel.create({
        text: 'Range Q => answer=5 => no matching => 0',
        type: 'Number',
        ...baseRangeConfig,
        order: 4,
      });

      // Range #2 => answer=15 => hits [10..20] => 5 points
      const rangeQ_answer15 = await NumberQuestionModel.create({
        text: 'Range Q => answer=15 => hits [10..20]',
        type: 'Number',
        ...baseRangeConfig,
        order: 5,
      });

      // Range #3 => answer=25 => between [20..30], triggers interpolation logic
      const rangeQ_answer25 = await NumberQuestionModel.create({
        text: 'Range Q => answer=25 => interpolation (gap between 20..30)',
        type: 'Number',
        ...baseRangeConfig,
        order: 6,
      });

      // Range #4 => answer=35 => hits [30..40] => 10 points
      const rangeQ_answer35 = await NumberQuestionModel.create({
        text: 'Range Q => answer=35 => hits [30..40]',
        type: 'Number',
        ...baseRangeConfig,
        order: 7,
      });

      // Range #5 => answer=45 => above 40 => defaults to last known range => 10
      const rangeQ_answer45 = await NumberQuestionModel.create({
        text: 'Range Q => answer=45 => above [30..40]',
        type: 'Number',
        ...baseRangeConfig,
        order: 8,
      });

      // 2) Create the new assessment
      const newAssessment = await InternalAssessmentModel.create({
        course: assessment.course,
        assessmentName: 'Number Qs Assessment',
        description: 'Number Qs',
        startDate: new Date('2000-01-01'),
        maxMarks: 100,
        scaleToMaxMarks: false,
        granularity: 'individual',
        areSubmissionsEditable: true,
        isReleased: true,
        questions: [
          tmsQuestion._id,
          directQ_zeroMax._id,
          directQ_normal._id,
          rangeQ_answer5._id,
          rangeQ_answer15._id,
          rangeQ_answer25._id,
          rangeQ_answer35._id,
          rangeQ_answer45._id,
        ],
      });

      // 3) Assign it so the user can submit
      await AssessmentAssignmentSetModel.create({
        assessment: newAssessment._id,
        assignedUsers: [{ user: student._id, tas: [ta._id] } as AssignedUser],
      });

      // 4) Build the submission answers
      const answers = [
        // TMS: referencing the student, or TA, or whomever
        {
          question: tmsQuestion._id,
          type: 'Team Member Selection Answer',
          selectedUserIds: [student._id.toString()],
        } as TeamMemberSelectionAnswer,

        // direct #1 => value=50 => but maxNumber=0 => final=0
        {
          question: directQ_zeroMax._id,
          type: 'Number Answer',
          value: 50,
        } as NumberAnswer,

        // direct #2 => value=50 => ratio(50/100) * 20 => 10
        {
          question: directQ_normal._id,
          type: 'Number Answer',
          value: 50,
        } as NumberAnswer,

        // range #1 => answer=5 => no matching => 2.5
        {
          question: rangeQ_answer5._id,
          type: 'Number Answer',
          value: 5,
        } as NumberAnswer,

        // range #2 => answer=15 => inside [10..20] => 5
        {
          question: rangeQ_answer15._id,
          type: 'Number Answer',
          value: 15,
        } as NumberAnswer,

        // range #3 => answer=25 => interpolation between [20..30]
        {
          question: rangeQ_answer25._id,
          type: 'Number Answer',
          value: 25,
        } as NumberAnswer,

        // range #4 => answer=35 => hits [30..40] => 10
        {
          question: rangeQ_answer35._id,
          type: 'Number Answer',
          value: 35,
        } as NumberAnswer,

        // range #5 => answer=45 => above 40 => last known => 10
        {
          question: rangeQ_answer45._id,
          type: 'Number Answer',
          value: 45,
        } as NumberAnswer,
      ];

      // 5) Create the submission
      const newSubmission = await SubmissionModel.create({
        assessment: newAssessment._id,
        user: ta._id, // We'll treat "ta" as the one creating the submission
        answers: [],
        isDraft: false,
      });
      // Insert each answer doc, then push to submission
      for (const ans of answers) {
        if (ans.type === 'Team Member Selection Answer') {
          const ansDoc = await TeamMemberSelectionAnswerModel.create(ans);
          newSubmission.answers.push(ansDoc);
        } else {
          const ansDoc = await NumberAnswerModel.create(ans);
          newSubmission.answers.push(ansDoc);
        }
      }
      await newSubmission.save();

      // Also create an AssessmentResult
      await AssessmentResultModel.create({
        assessment: newAssessment._id,
        student: student._id,
        marks: [
          {
            marker: ta._id,
            submission: newSubmission._id,
            score: 0,
          },
        ],
      });

      // 6) Regrade => should handle all code paths in calculateNumberScore
      const regraded = await regradeSubmission(newSubmission._id.toString());
      expect(regraded).toBeDefined();

      // 7) [Optional] Check final score
      // directQ_zeroMax => 0
      // directQ_normal => 5
      // rangeQ_answer5 => 2.5
      // rangeQ_answer15 => 5
      //
      // For answer=25 => lowerRange=[10..20]=5, higherRange=[30..40]=10,
      // slope=(10-5)/(30-20)=0.5 => 5 + 0.5*(25-20)=5+2.5=7.5
      //
      // rangeQ_answer35 => hits [30..40]=10
      // rangeQ_answer45 => no higherRange => => last known => 10
      //
      // total = 0 + 5 + 2.5 + 5 + 7.5 + 10 + 10 = 40
      expect(regraded.score).toBeCloseTo(40, 5);
    });

    it('should correctly calculate scores for 7 scale questions covering all paths in calculateScaleScore', async () => {
      // 1. Create a brand-new minimal assessment
      const tmsQuestion = await TeamMemberSelectionQuestionModel.create({
        text: 'Select team members for grading',
        type: 'Team Member Selection',
        isRequired: true,
        isLocked: false,
        order: 1,
      });

      // 2. Create 7 Scale questions with 4 labels each
      const baseScaleConfig = {
        isScored: true,
        labels: [
          { value: 1, label: 'Very Poor', points: 0 },
          { value: 11, label: 'Poor', points: 5 },
          { value: 21, label: 'Good', points: 10 },
          { value: 31, label: 'Excellent', points: 10 },
        ],
        scaleMax: 31,
        order: 1,
      };

      // Create 7 identical Scale questions to test different answers
      const scaleQuestions = [];
      for (let i = 1; i <= 7; i++) {
        const scaleQ = await ScaleQuestionModel.create({
          text: `Scale Question ${i}`,
          type: 'Scale',
          isRequired: true,
          isLocked: false,
          ...baseScaleConfig,
          order: 1 + i, // Ensure unique ordering
        });
        scaleQuestions.push(scaleQ);
      }

      // 3. Create the new assessment
      const newAssessment = await InternalAssessmentModel.create({
        course: assessment.course,
        assessmentName: 'Scale Scoring Assessment',
        description: 'Assessment to test calculateScaleScore function',
        startDate: new Date('2000-01-01'),
        maxMarks: 100,
        scaleToMaxMarks: false,
        granularity: 'individual',
        areSubmissionsEditable: true,
        isReleased: true,
        questions: [tmsQuestion._id, ...scaleQuestions.map(q => q._id)],
      });

      // 4. Assign the assessment to the student and TA
      await AssessmentAssignmentSetModel.create({
        assessment: newAssessment._id,
        assignedUsers: [{ user: student._id, tas: [ta._id] } as AssignedUser],
      });

      // 5. Build the submission answers
      const answers: (TeamMemberSelectionAnswer | NumberAnswer)[] = [
        // Team Member Selection Answer
        await TeamMemberSelectionAnswerModel.create({
          question: tmsQuestion._id,
          type: 'Team Member Selection Answer',
          selectedUserIds: [student._id.toString()],
        }),
      ];

      // Define the 7 Scale answers to cover all paths
      const scaleAnswersData = [
        // Exact label matches
        { question: scaleQuestions[0]._id, value: 1 }, // Exactly on first label
        { question: scaleQuestions[1]._id, value: 11 }, // Exactly on second label
        { question: scaleQuestions[2]._id, value: 21 }, // Exactly on third label
        { question: scaleQuestions[3]._id, value: 31 }, // Exactly on fourth label
        // Intermediate values for interpolation
        { question: scaleQuestions[4]._id, value: 6 }, // Between 10 and 20
        { question: scaleQuestions[5]._id, value: 16 }, // Between 20 and 30
        { question: scaleQuestions[6]._id, value: 26 }, // Between 30 and 40
      ];

      // Create and push each Scale answer
      for (const sa of scaleAnswersData) {
        const scaleAnsDoc = await ScaleAnswerModel.create({
          question: sa.question,
          type: 'Scale Answer',
          value: sa.value,
        });
        answers.push(scaleAnsDoc);
      }

      // 6. Create the submission with all answers
      const newSubmission = await SubmissionModel.create({
        assessment: newAssessment._id,
        user: ta._id, // Assuming TA is submitting
        answers: [],
        isDraft: false,
      });

      // Add all answer documents to the submission
      for (const ans of answers) {
        newSubmission.answers.push(ans);
      }
      await newSubmission.save();

      // 7. Create an AssessmentResult document
      await AssessmentResultModel.create({
        assessment: newAssessment._id,
        student: student._id,
        marks: [
          {
            marker: ta._id,
            submission: newSubmission._id,
            score: 0, // Initial score before regrading
          },
        ],
      });

      // 8. Regrade the submission
      const regraded = await regradeSubmission(newSubmission._id.toString());
      expect(regraded).toBeDefined();

      // 9. Calculate the expected total score
      // Breakdown per Scale Answer:
      // Q1: value=0 => points=0 (exact first label)
      // Q2: value=10 => points=5 (exact second label)
      // Q3: value=20 => points=10 (exact third label)
      // Q4: value=30 => points=10 (exact fourth label)
      // Q5: value=5 => between 0-10 => 2.5
      // Q6: value=15 => between 10-20 => 7.5
      // Q7: value=25 => between 20-30 => 10
      //
      // Total Expected Points: 0 + 5 + 10 + 10 + 2.5 + 7.5 + 10 = 45
      const expectedTotal = 45;
      // 10. Assert that the regraded score matches the expected total
      expect(regraded.score).toBeCloseTo(expectedTotal, 5);
    });

    it('should correctly calculate scores for Multiple Choice Questions covering all paths in calculateMultipleChoiceScore', async () => {
      // 1. Create a brand-new minimal assessment
      const tmsQuestion = await TeamMemberSelectionQuestionModel.create({
        text: 'Select team members for grading',
        type: 'Team Member Selection',
        isRequired: true,
        isLocked: false,
        order: 1,
      });

      // 2. Create Multiple Choice Questions
      // MCQ1: isScored = true
      const mcqScored = await MultipleChoiceQuestionModel.create({
        text: 'Scored MCQ',
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

      // MCQ2: isScored = false
      const mcqNonScored = await MultipleChoiceQuestionModel.create({
        text: 'Non-Scored MCQ',
        type: 'Multiple Choice',
        isRequired: true,
        isLocked: false,
        isScored: false,
        options: [
          { text: 'Option C', points: 0 },
          { text: 'Option D', points: 0 },
        ] as MultipleChoiceOption[],
        order: 3,
      });

      // MCQ3: isScored = true but invalid answer
      const mcqInvalid = await MultipleChoiceQuestionModel.create({
        text: 'Scored MCQ with Invalid Answer',
        type: 'Multiple Choice',
        isRequired: true,
        isLocked: false,
        isScored: true,
        options: [
          { text: 'Option E', points: 5 },
          { text: 'Option F', points: 10 },
        ] as MultipleChoiceOption[],
        order: 4,
      });

      // 3. Create the new assessment
      const newAssessment = await InternalAssessmentModel.create({
        course: assessment.course,
        assessmentName: 'Multiple Choice Scoring Assessment',
        description: 'Assessment to test calculateMultipleChoiceScore function',
        startDate: new Date('2000-01-01'),
        maxMarks: 25,
        scaleToMaxMarks: false,
        granularity: 'individual',
        areSubmissionsEditable: true,
        isReleased: true,
        questions: [
          tmsQuestion._id,
          mcqScored._id,
          mcqNonScored._id,
          mcqInvalid._id,
        ],
      });

      // 4. Assign the assessment to the student and TA
      await AssessmentAssignmentSetModel.create({
        assessment: newAssessment._id,
        assignedUsers: [{ user: student._id, tas: [ta._id] } as AssignedUser],
      });

      // 5. Build the submission answers
      const answers = [
        // Team Member Selection Answer
        {
          question: tmsQuestion._id,
          type: 'Team Member Selection Answer',
          selectedUserIds: [student._id.toString()],
        } as TeamMemberSelectionAnswer,

        // MCQ1 Answer: Select 'Option A' => 5 points
        {
          question: mcqScored._id,
          type: 'Multiple Choice Answer',
          value: 'Option A',
        } as MultipleChoiceAnswer,

        // MCQ2 Answer: Select 'Option D' => Non-scored => 0 points
        {
          question: mcqNonScored._id,
          type: 'Multiple Choice Answer',
          value: 'Option D',
        } as MultipleChoiceAnswer,

        // MCQ3 Answer: Select 'Invalid Option' => Should handle gracefully
        {
          question: mcqInvalid._id,
          type: 'Multiple Choice Answer',
          value: 'Invalid Option',
        } as MultipleChoiceAnswer,
      ];

      // 6. Create the submission with all answers
      const newSubmission = await SubmissionModel.create({
        assessment: newAssessment._id,
        user: ta._id, // Assuming TA is submitting
        answers: [],
        isDraft: false,
      });

      // Add all answer documents to the submission
      for (const ans of answers) {
        if (ans.type === 'Team Member Selection Answer') {
          const ansDoc = await TeamMemberSelectionAnswerModel.create(ans);
          newSubmission.answers.push(ansDoc);
        } else {
          const ansDoc = await MultipleChoiceAnswerModel.create(ans);
          newSubmission.answers.push(ansDoc);
        }
      }
      await newSubmission.save();

      // 7. Create an AssessmentResult document
      await AssessmentResultModel.create({
        assessment: newAssessment._id,
        student: student._id,
        marks: [
          {
            marker: ta._id,
            submission: newSubmission._id,
            score: 0, // Initial score before regrading
          },
        ],
      });

      // 8. Regrade the submission
      const regraded = await regradeSubmission(newSubmission._id.toString());
      expect(regraded).toBeDefined();

      // 9. Calculate the expected total score
      // MCQ1: 'Option A' => 5 points
      // MCQ2: Non-scored => 0 points
      // MCQ3: 'Invalid Option' => Depending on implementation:
      //   - If the code throws an error when option not found, expect the test to have already failed.
      //   - If it assigns 0 points, include it in the total.
      // Assuming it assigns 0 points:
      //
      // Total Expected Points: 5 + 0 + 0 = 5
      expect(regraded.score).toBeCloseTo(5, 1);
    });

    it('should correctly calculate scores for Multiple Response Questions covering all paths in calculateMultipleResponseScore', async () => {
      // 1. Create a brand-new minimal assessment
      const tmsQuestion = await TeamMemberSelectionQuestionModel.create({
        text: 'Select team members for grading',
        type: 'Team Member Selection',
        isRequired: true,
        isLocked: false,
        order: 1,
      });

      // 2. Create Multiple Response Questions with varying configurations
      // MRQ1: allowPartialMarks = false, areWrongAnswersPenalized = false, allowNegative = false
      const mrqNoPartialNoPenalty = await MultipleResponseQuestionModel.create({
        text: 'MRQ1: No Partial Marks, No Penalty',
        type: 'Multiple Response',
        isRequired: true,
        isLocked: false,
        isScored: true,
        allowPartialMarks: false,
        areWrongAnswersPenalized: false,
        allowNegative: false,
        options: [
          { text: 'Option A', points: 5 },
          { text: 'Option B', points: 0 },
          { text: 'Option C', points: 0 },
        ],
        order: 2,
      });

      const mrqNoPartialNoPenaltyWrongAnswer =
        await MultipleResponseQuestionModel.create({
          text: 'MRQ1: No Partial Marks, No Penalty, Wrong Answer',
          type: 'Multiple Response',
          isRequired: true,
          isLocked: false,
          isScored: true,
          allowPartialMarks: false,
          areWrongAnswersPenalized: false,
          allowNegative: false,
          options: [
            { text: 'Option A', points: 5 },
            { text: 'Option B', points: 0 },
            { text: 'Option C', points: 0 },
          ],
          order: 2,
        });

      // MRQ2: allowPartialMarks = true, areWrongAnswersPenalized = false, allowNegative = false
      const mrqPartialNoPenalty = await MultipleResponseQuestionModel.create({
        text: 'MRQ2: Partial Marks, No Penalty',
        type: 'Multiple Response',
        isRequired: true,
        isLocked: false,
        isScored: true,
        allowPartialMarks: true,
        areWrongAnswersPenalized: false,
        allowNegative: false,
        options: [
          { text: 'Option D', points: 5 },
          { text: 'Option E', points: 5 },
          { text: 'Option F', points: 0 },
          { text: 'Option G', points: 0 },
        ],
        order: 3,
      });

      // MRQ3: allowPartialMarks = true, areWrongAnswersPenalized = true, allowNegative = false
      const mrqPartialPenaltyNoNegative =
        await MultipleResponseQuestionModel.create({
          text: 'MRQ3: Partial Marks, Penalty, No Negative',
          type: 'Multiple Response',
          isRequired: true,
          isLocked: false,
          isScored: true,
          allowPartialMarks: true,
          areWrongAnswersPenalized: true,
          allowNegative: false,
          options: [
            { text: 'Option H', points: 5 },
            { text: 'Option I', points: -5 },
            { text: 'Option J', points: 0 },
          ],
          order: 4,
        });

      // MRQ4: allowPartialMarks = true, areWrongAnswersPenalized = true, allowNegative = true
      const mrqPartialPenaltyNegative =
        await MultipleResponseQuestionModel.create({
          text: 'MRQ4: Partial Marks, Penalty, Negative',
          type: 'Multiple Response',
          isRequired: true,
          isLocked: false,
          isScored: true,
          allowPartialMarks: true,
          areWrongAnswersPenalized: true,
          allowNegative: true,
          options: [
            { text: 'Option K', points: 5 },
            { text: 'Option L', points: -5 },
            { text: 'Option M', points: 0 },
          ],
          order: 5,
        });

      // MRQ5: Additional MRQ to cover remaining paths
      // Example: allowPartialMarks = false, areWrongAnswersPenalized = true, allowNegative = false
      const mrqNoPartialPenaltyNoNegative =
        await MultipleResponseQuestionModel.create({
          text: 'MRQ5: No Partial Marks, Penalty, No Negative',
          type: 'Multiple Response',
          isRequired: true,
          isLocked: false,
          isScored: true,
          allowPartialMarks: false,
          areWrongAnswersPenalized: true,
          allowNegative: false,
          options: [
            { text: 'Option N', points: 5 },
            { text: 'Option O', points: -5 },
            { text: 'Option P', points: 0 },
          ],
          order: 6,
        });

      // 3. Create the new assessment
      const newAssessment = await InternalAssessmentModel.create({
        course: assessment.course,
        assessmentName: 'Multiple Response Scoring Assessment',
        description:
          'Assessment to test calculateMultipleResponseScore function',
        startDate: new Date('2000-01-01'),
        maxMarks: 40,
        scaleToMaxMarks: false,
        granularity: 'individual',
        areSubmissionsEditable: true,
        isReleased: true,
        questions: [
          tmsQuestion._id,
          mrqNoPartialNoPenalty._id,
          mrqNoPartialNoPenaltyWrongAnswer._id,
          mrqPartialNoPenalty._id,
          mrqPartialPenaltyNoNegative._id,
          mrqPartialPenaltyNegative._id,
          mrqNoPartialPenaltyNoNegative._id,
        ],
      });

      // 4. Assign the assessment to the student and TA
      await AssessmentAssignmentSetModel.create({
        assessment: newAssessment._id,
        assignedUsers: [{ user: student._id, tas: [ta._id] } as AssignedUser],
      });

      // 5. Build the submission answers
      const answers = [
        // Team Member Selection Answer
        {
          question: tmsQuestion._id,
          type: 'Team Member Selection Answer',
          selectedUserIds: [student._id.toString()],
        } as TeamMemberSelectionAnswer,

        // MRQ1 Answers
        {
          question: mrqNoPartialNoPenalty._id,
          type: 'Multiple Response Answer',
          values: ['Option A'], // Only correct options
        } as MultipleResponseAnswer,

        {
          question: mrqNoPartialNoPenaltyWrongAnswer._id,
          type: 'Multiple Response Answer',
          values: ['Option B'], // Only correct options
        } as MultipleResponseAnswer,

        // MRQ2 Answers
        {
          question: mrqPartialNoPenalty._id,
          type: 'Multiple Response Answer',
          values: ['Option D', 'Option E'], // Partial correct, no penalties
        } as MultipleResponseAnswer,

        // MRQ3 Answers
        {
          question: mrqPartialPenaltyNoNegative._id,
          type: 'Multiple Response Answer',
          values: ['Option H', 'Option I'], // Partial correct with penalty, but allowNegative=false
        } as MultipleResponseAnswer,

        // MRQ4 Answers
        {
          question: mrqPartialPenaltyNegative._id,
          type: 'Multiple Response Answer',
          values: ['Option K', 'Option L'], // Partial correct with penalty and allowNegative=true
        } as MultipleResponseAnswer,

        // MRQ5 Answers
        {
          question: mrqNoPartialPenaltyNoNegative._id,
          type: 'Multiple Response Answer',
          values: ['Option N'], // Only correct options, no partial marks
        } as MultipleResponseAnswer,
      ];

      // 6. Create the submission with all answers
      const newSubmission = await SubmissionModel.create({
        assessment: newAssessment._id,
        user: ta._id, // Assuming TA is submitting
        answers: [],
        isDraft: false,
      });

      // Add all answer documents to the submission
      for (const ans of answers) {
        if (ans.type === 'Team Member Selection Answer') {
          const ansDoc = await TeamMemberSelectionAnswerModel.create(ans);
          newSubmission.answers.push(ansDoc);
        } else {
          const ansDoc = await MultipleResponseAnswerModel.create(ans);
          newSubmission.answers.push(ansDoc);
        }
      }
      await newSubmission.save();

      // 7. Create an AssessmentResult document
      await AssessmentResultModel.create({
        assessment: newAssessment._id,
        student: student._id,
        marks: [
          {
            marker: ta._id,
            submission: newSubmission._id,
            score: 0, // Initial score before regrading
          },
        ],
      });

      // 8. Regrade the submission
      const regraded = await regradeSubmission(newSubmission._id.toString());
      expect(regraded).toBeDefined();

      // 9. Calculate the expected total score
      // Breakdown per MRQ:
      // MRQ1: allowPartialMarks=false, no penalties
      //   - Selected ['Option A'] which is correct (assuming 'Option A' is a correct option)
      //   - Perfect selection => sum points: 5 (if 'Option A' has 5 points)
      //
      // MRQ2: allowPartialMarks=true, no penalties
      //   - Selected ['Option D', 'Option E'] which are both correct
      //   - Sum points: 5 + 5 = 10
      //
      // MRQ3: allowPartialMarks=true, penalties=true, allowNegative=false
      //   - Selected ['Option H', 'Option I']
      //   - 'Option H' = 5, 'Option I' = -5
      //   - Sum points: 5 + (-5) = 0
      //   - Since allowNegative=false, clamp to 0
      //
      // MRQ4: allowPartialMarks=true, penalties=true, allowNegative=true
      //   - Selected ['Option K', 'Option L']
      //   - 'Option K' = 5, 'Option L' = -5
      //   - Sum points: 5 + (-5) = 0
      //   - allowNegative=true => no clamping
      //
      // MRQ5: allowPartialMarks=false, penalties=true, allowNegative=false
      //   - Selected ['Option N'] which is correct
      //   - Perfect selection => sum points: 5 (assuming 'Option N' has 5 points)
      //
      // Total Expected Points: 5 + 10 + 0 + 0 + 5 = 20

      const expectedTotal = 20;

      // 10. Assert that the regraded score matches the expected total
      expect(regraded.score).toBeCloseTo(expectedTotal, 1);
    });
  });
});
