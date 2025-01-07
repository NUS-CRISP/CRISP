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
  recaluculateSubmissionsForAssessment,
  reorderQuestions,
  deleteQuestionById,
} from '../../services/internalAssessmentService';
import {
  MultipleChoiceOption,
  MultipleChoiceQuestion,
  MultipleChoiceQuestionModel,
  TeamMemberSelectionQuestionModel,
  MultipleResponseQuestionModel,
  MultipleResponseQuestion,
  NumberQuestion,
  ScaleQuestion,
  DateQuestion,
  UndecidedQuestion,
  NUSNETIDQuestion,
  NUSNETEmailQuestion,
  ShortResponseQuestion,
  LongResponseQuestion,
} from '@models/QuestionTypes';
import {
  TeamMemberSelectionAnswerModel,
  MultipleChoiceAnswerModel,
  MultipleResponseAnswerModel,
} from '@models/Answer';
import AssessmentAssignmentSetModel, {
  AssignedUser,
} from '@models/AssessmentAssignmentSet';
import SubmissionModel from '@models/Submission';
import TeamModel from '@models/Team';
import TeamSetModel from '@models/TeamSet';
import UserModel from '@models/User';
import AssessmentResultModel from '@models/AssessmentResult';
import QuestionModel from '@models/Question';

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

/**
 * Creates a baseline:
 * - A "Faculty member" account
 * - A Course with 1 teamSet, 1 team (with student & TA)
 * - An InternalAssessment (Midterm Exam) with a "Team Member Selection" question (locked) & a "Multiple Choice" question
 * - A Submission & an AssessmentResult
 */
const setupData = async () => {
  // 1) Faculty account
  const account = new AccountModel({
    email: 'faculty@example.com',
    password: 'password',
    role: 'Faculty member',
    user: new mongoose.Types.ObjectId(),
    isApproved: true,
  });
  await account.save();

  // 2) A course
  const course = await CourseModel.create({
    name: 'Introduction to Computer Science',
    code: 'CS101',
    semester: 'Fall 2024',
    startDate: new Date('2024-08-15'),
    courseType: 'Normal',
  });
  await course.save();

  // 3) A student & TA
  const student = await UserModel.create({
    identifier: 'studentUser',
    name: 'Test Student',
  });
  const ta = await UserModel.create({
    identifier: 'taUser',
    name: 'Test TA',
  });

  // 4) A team referencing that student & TA
  const team = new TeamModel({
    number: 1,
    members: [student],
    TA: ta,
  });
  await team.save();

  // 5) A TeamSet referencing that team
  const teamSet = new TeamSetModel({
    name: 'Team Set 1',
    course: course._id,
    teams: [team],
  });
  await teamSet.save();

  // 6) A locked "Team Member Selection" question
  const teamMemberQuestion = new TeamMemberSelectionQuestionModel({
    text: 'Select students',
    type: 'Team Member Selection',
    isRequired: true,
    isLocked: true,
    order: 1,
  });
  await teamMemberQuestion.save();

  // 7) A sample answer
  const teamMemberAnswer = new TeamMemberSelectionAnswerModel({
    question: teamMemberQuestion._id,
    type: 'Team Member Selection Answer',
    selectedUserIds: [student._id],
  });
  await teamMemberAnswer.save();

  // 8) A MultipleChoice question
  const mcQuestion = new MultipleChoiceQuestionModel({
    text: '星街すいせいは。。。',
    type: 'Multiple Choice',
    isRequired: true,
    isLocked: false,
    isScored: true,
    options: [
      { text: '今日もかわいい', points: 10 },
      { text: '今日も怖い', points: 5 },
    ] as MultipleChoiceOption[],
    order: 2,
  });
  await mcQuestion.save();

  // 9) A MC answer referencing "今日も怖い"
  const mcAnswer = new MultipleChoiceAnswerModel({
    question: mcQuestion._id,
    type: 'Multiple Choice Answer',
    value: '今日も怖い',
  });
  await mcAnswer.save();

  // 10) InternalAssessment
  const startDate = new Date();
  startDate.setUTCFullYear(new Date().getUTCFullYear() - 1);
  const assessment = new InternalAssessmentModel({
    course: course._id,
    assessmentName: 'Midterm Exam',
    description: 'Midterm assessment',
    startDate,
    maxMarks: 10,
    scaleToMaxMarks: true,
    granularity: 'team',
    teamSet: teamSet._id,
    areSubmissionsEditable: true,
    results: [],
    isReleased: false,
    questions: [teamMemberQuestion, mcQuestion],
  });
  await assessment.save();
  course.internalAssessments.push(assessment._id);
  await course.save();

  // 11) Assignment Set referencing the same student
  const assignmentSet = await AssessmentAssignmentSetModel.create({
    assessment: assessment._id,
    assignedUsers: [{ user: student._id, tas: [ta._id] } as AssignedUser],
  });
  await assignmentSet.save();
  assessment.assessmentAssignmentSet = assignmentSet._id;
  await assessment.save();

  // 12) A submission
  const submission = new SubmissionModel({
    assessment: assessment,
    user: ta,
    answers: [teamMemberAnswer, mcAnswer],
    isDraft: false,
    submittedAt: new Date(),
    score: 5,
  });
  await submission.save();

  // 13) A result
  const result = new AssessmentResultModel({
    assessment: assessment._id,
    student: student._id,
    marker: ta._id,
    marks: [{ marker: ta._id, submission: submission._id, score: 5 }],
    averageScore: 5,
  });
  await result.save();

  return {
    course,
    account,
    teamSet,
    teamMemberQuestion,
    teamMemberAnswer,
    mcQuestion,
    mcAnswer,
    ta,
    student,
    assessment,
    result,
  };
};

describe('internalAssessmentService', () => {
  let course: any;
  let account: any;
  let teamSet: any;
  let assessment: any;
  let mcQuestion: any;

  beforeAll(async () => {
    // No-op here because we do everything in beforeEach
  });

  beforeEach(async () => {
    ({ course, account, teamSet, mcQuestion, assessment } = await setupData());
  });

  /* -----------------------------------------------------------------------
   * getInternalAssessmentById
   * ----------------------------------------------------------------------- */
  describe('getInternalAssessmentById', () => {
    it('should retrieve an internal assessment by ID', async () => {
      const fetched = await getInternalAssessmentById(
        assessment._id.toString(),
        account._id.toString()
      );
      expect(fetched._id.toString()).toEqual(assessment._id.toString());
    });

    it('should throw NotFoundError if account is missing', async () => {
      const badAccountId = new mongoose.Types.ObjectId().toString();
      await expect(
        getInternalAssessmentById(assessment._id.toString(), badAccountId)
      ).rejects.toThrow('Account not found');
    });

    it('should throw NotFoundError if assessment not found', async () => {
      const invalidAid = new mongoose.Types.ObjectId().toString();
      await expect(
        getInternalAssessmentById(invalidAid, account._id.toString())
      ).rejects.toThrow('Assessment not found');
    });
  });

  /* -----------------------------------------------------------------------
   * updateInternalAssessmentById
   * ----------------------------------------------------------------------- */
  describe('updateInternalAssessmentById', () => {
    it('should update an assessment by ID', async () => {
      const result = await updateInternalAssessmentById(
        assessment._id.toString(),
        account._id.toString(),
        { assessmentName: 'UpdatedExamName' }
      );
      expect(result.assessmentName).toEqual('UpdatedExamName');
    });

    it('should throw NotFoundError if account missing', async () => {
      const noAccId = new mongoose.Types.ObjectId().toString();
      await expect(
        updateInternalAssessmentById(assessment._id.toString(), noAccId, {})
      ).rejects.toThrow('Account not found');
    });

    it('should throw BadRequestError if account is not faculty/admin', async () => {
      const studentAcc = await AccountModel.create({
        email: 'student-acc@example.com',
        password: 'password',
        role: 'Student',
      });
      await expect(
        updateInternalAssessmentById(
          assessment._id.toString(),
          studentAcc._id.toString(),
          {}
        )
      ).rejects.toThrow('Unauthorized');
    });

    it('should throw NotFoundError if assessment does not exist', async () => {
      const fakeAid = new mongoose.Types.ObjectId().toString();
      await expect(
        updateInternalAssessmentById(fakeAid, account._id.toString(), {
          assessmentName: 'DoesntMatter',
        })
      ).rejects.toThrow('Assessment not found');
    });
  });

  /* -----------------------------------------------------------------------
   * deleteInternalAssessmentById
   * ----------------------------------------------------------------------- */
  describe('deleteInternalAssessmentById', () => {
    it('should delete an assessment by ID', async () => {
      await deleteInternalAssessmentById(assessment._id.toString());
      const check = await InternalAssessmentModel.findById(assessment._id);
      expect(check).toBeNull();
    });

    it('should throw NotFoundError if assessment is missing', async () => {
      const invalidAId = new mongoose.Types.ObjectId().toString();
      await expect(
        deleteInternalAssessmentById(invalidAId)
      ).rejects.toThrow('Assessment not found');
    });
  });

  /* -----------------------------------------------------------------------
   * addInternalAssessmentsToCourse
   * ----------------------------------------------------------------------- */
  describe('addInternalAssessmentsToCourse', () => {
    it('should add a new assessment to course', async () => {
      const startDate = new Date();
      startDate.setUTCFullYear(startDate.getUTCFullYear() - 1);

      await addInternalAssessmentsToCourse(course._id.toString(), [
        {
          assessmentName: 'Final Exam',
          description: 'Final assessment desc',
          startDate,
          maxMarks: 50,
          scaleToMaxMarks: true,
          granularity: 'individual',
          teamSetName: teamSet.name, // The same name we used
          areSubmissionsEditable: true,
        },
      ]);

      const updatedCourse = await CourseModel.findById(course._id).populate(
        'internalAssessments'
      );
      expect(updatedCourse?.internalAssessments.length).toBe(2); // originally 1 -> now 2
    });

    it('should throw if given empty data', async () => {
      await expect(
        addInternalAssessmentsToCourse(course._id.toString(), [])
      ).rejects.toThrow('Invalid or empty internal assessments data');
    });

    it('should throw NotFoundError if course is missing', async () => {
      const bogusCid = new mongoose.Types.ObjectId().toString();
      await expect(
        addInternalAssessmentsToCourse(bogusCid, [
          {
            assessmentName: 'BogusAssess',
            description: 'desc',
            startDate: new Date(),
            scaleToMaxMarks: true,
            granularity: 'team',
            teamSetName: teamSet.name,
            areSubmissionsEditable: true,
          },
        ])
      ).rejects.toThrow('Course not found');
    });

    it('should skip creation if assessment name already exists', async () => {
      // "Midterm Exam" is the existing name
      await expect(addInternalAssessmentsToCourse(course._id.toString(), [
        {
          assessmentName: 'Midterm Exam', // duplicate
          description: 'desc',
          startDate: new Date(),
          scaleToMaxMarks: true,
          granularity: 'team',
          teamSetName: teamSet.name,
          areSubmissionsEditable: true,
        },
      ])).rejects.toThrow();
      const c = await CourseModel.findById(course._id).populate(
        'internalAssessments'
      );
      // Should remain 1
      expect(c?.internalAssessments.length).toBe(1);
    });

    it('should skip creation if TeamSet is missing', async () => {
      // We'll pass a non-existent teamSetName => logs error => skip
      await expect(addInternalAssessmentsToCourse(course._id.toString(), [
        {
          assessmentName: 'AnotherAssess',
          description: 'desc',
          startDate: new Date(),
          scaleToMaxMarks: true,
          granularity: 'team',
          teamSetName: 'MissingTeamSet',
          areSubmissionsEditable: true,
        },
      ])).rejects.toThrow();
      const c = await CourseModel.findById(course._id).populate(
        'internalAssessments'
      );
      // Still 1
      expect(c?.internalAssessments.length).toBe(1);
    });

    it('should throw BadRequestError if none added', async () => {
      // Attempt to add duplicates + invalid sets => none get created => throw
      await expect(
        addInternalAssessmentsToCourse(course._id.toString(), [
          {
            assessmentName: 'Midterm Exam', // existing
            description: 'desc',
            startDate: new Date(),
            scaleToMaxMarks: true,
            granularity: 'team',
            teamSetName: 'MissingTeamSet',
            areSubmissionsEditable: true,
          },
        ])
      ).rejects.toThrow('Failed to add any internal assessments');
    });
  });

  /* -----------------------------------------------------------------------
   * addQuestionToAssessment
   * ----------------------------------------------------------------------- */
  describe('addQuestionToAssessment', () => {
    it('should add a Multiple Choice question', async () => {
      const qData = {
        type: 'Multiple Choice',
        text: '2+2=?',
        options: [{ text: '4', points: 5 }],
        isScored: true,
        order: 3
      } as Partial<MultipleChoiceQuestion>;

      const q = await addQuestionToAssessment(
        assessment._id.toString(),
        qData,
        account._id.toString()
      );
      expect(q.type).toBe('Multiple Choice');
      const updated = await InternalAssessmentModel.findById(assessment._id);
      expect(updated?.questions.length).toBe(3); // was 2 -> now 3
    });

    it('should add a Multiple Response question', async () => {
      const qData: Partial<MultipleResponseQuestion> = {
        type: 'Multiple Response',
        text: 'Pick items',
        options: [
          { text: 'OptionA', points: 2 },
          { text: 'OptionB', points: -1 },
        ],
        isScored: true,
        allowNegative: true,
        areWrongAnswersPenalized: true,
        allowPartialMarks: true,
        order: 3
      };
      const q = await addQuestionToAssessment(
        assessment._id.toString(),
        qData,
        account._id.toString()
      );
      expect(q.type).toBe('Multiple Response');
    });

    it('should add a Scale question', async () => {
      const qData: Partial<ScaleQuestion> = {
        type: 'Scale',
        text: 'Rate your experience',
        scaleMax: 5,
        labels: [
          { value: 1, label: 'Bad', points: 0 },
          { value: 5, label: 'Good', points: 10 },
        ],
        isScored: true,
        order: 3
      };
      const q = await addQuestionToAssessment(
        assessment._id.toString(),
        qData,
        account._id.toString()
      );
      expect(q.type).toBe('Scale');
    });

    it('should add a Number question', async () => {
      const qData: Partial<NumberQuestion> = {
        type: 'Number',
        text: 'Enter a number up to 100',
        maxNumber: 100,
        isScored: true,
        scoringMethod: 'direct',
        maxPoints: 10,
        order: 3
      };
      const q = await addQuestionToAssessment(
        assessment._id.toString(),
        qData,
        account._id.toString()
      );
      expect(q.type).toBe('Number');
    });

    it('should add a NUSNET ID question', async () => {
      const qData: Partial<NUSNETIDQuestion> = {
        type: 'NUSNET ID',
        text: 'Enter your ID',
        shortResponsePlaceholder: 'e0123456',
        order: 3
      };
      const q = await addQuestionToAssessment(
        assessment._id.toString(),
        qData,
        account._id.toString()
      );
      expect(q.type).toBe('NUSNET ID');
    });

    it('should add a NUSNET Email question', async () => {
      const qData: Partial<NUSNETEmailQuestion> = {
        type: 'NUSNET Email',
        text: 'Enter your email',
        shortResponsePlaceholder: 'xxxx@u.nus.edu',
        order: 3
      };
      const q = await addQuestionToAssessment(
        assessment._id.toString(),
        qData,
        account._id.toString()
      );
      expect(q.type).toBe('NUSNET Email');
    });

    it('should add a Short Response question', async () => {
      const qData: Partial<ShortResponseQuestion> = {
        type: 'Short Response',
        text: 'Briefly describe...',
        shortResponsePlaceholder: 'Enter short text',
        order: 3
      };
      const q = await addQuestionToAssessment(
        assessment._id.toString(),
        qData,
        account._id.toString()
      );
      expect(q.type).toBe('Short Response');
    });

    it('should add a Long Response question', async () => {
      const qData: Partial<LongResponseQuestion> = {
        type: 'Long Response',
        text: 'Elaborate on...',
        longResponsePlaceholder: 'Your essay here',
        order: 3
      };
      const q = await addQuestionToAssessment(
        assessment._id.toString(),
        qData,
        account._id.toString()
      );
      expect(q.type).toBe('Long Response');
    });

    it('should add a Date question', async () => {
      const qData: Partial<DateQuestion> = {
        type: 'Date',
        text: 'Select a date or date range',
        isRange: true,
        order: 3
      };
      const q = await addQuestionToAssessment(
        assessment._id.toString(),
        qData,
        account._id.toString()
      );
      expect(q.type).toBe('Date');
    });

    it('should add an Undecided question by default', async () => {
      const qData: Partial<UndecidedQuestion> = {
        text: 'We do not yet know this question type',
        type: 'Undecided',
        order: 3
      };
      const q = await addQuestionToAssessment(
        assessment._id.toString(),
        qData,
        account._id.toString()
      );
      expect(q.type).toBe('Undecided');
    });

    it('should throw NotFoundError if account missing', async () => {
      const missingAcc = new mongoose.Types.ObjectId().toString();
      await expect(
        addQuestionToAssessment(assessment._id.toString(), {}, missingAcc)
      ).rejects.toThrowError('Account not found');
    });

    it('should throw BadRequestError if account is not admin/faculty', async () => {
      const studAcc = await AccountModel.create({
        email: 'stud@example.com',
        password: 'pass',
        role: 'Student',
      });
      await expect(
        addQuestionToAssessment(assessment._id.toString(), {}, studAcc._id.toString())
      ).rejects.toThrowError('Unauthorized');
    });

    it('should throw NotFoundError if assessment missing', async () => {
      const invalidAid = new mongoose.Types.ObjectId().toString();
      await expect(
        addQuestionToAssessment(invalidAid, { type: 'Multiple Choice', text: '??' }, account._id.toString())
      ).rejects.toThrowError('Assessment not found');
    });

    it('should throw BadRequestError if type or text missing', async () => {
      await expect(
        addQuestionToAssessment(assessment._id.toString(), { text: 'No type' }, account._id.toString())
      ).rejects.toThrow('Both type and text fields are required');
    });

    it('should validate specialized fields (e.g. multiple response, scale, number)', async () => {
      await expect(
        addQuestionToAssessment(
          assessment._id.toString(),
          { type: 'Multiple Response', text: 'Pick some', options: [] },
          account._id.toString()
        )
      ).rejects.toThrow('Options are required for Multiple Response questions');
    });
  });

  /* -----------------------------------------------------------------------
   * getQuestionsByAssessmentId
   * ----------------------------------------------------------------------- */
  describe('getQuestionsByAssessmentId', () => {
    it('should retrieve all questions for an assessment', async () => {
      const result = await getQuestionsByAssessmentId(
        assessment._id.toString(),
        account._id.toString()
      );
      expect(result.length).toBe(2); // teamMember + mc
    });

    it('should throw NotFoundError if account missing', async () => {
      const badAcc = new mongoose.Types.ObjectId().toString();
      await expect(
        getQuestionsByAssessmentId(assessment._id.toString(), badAcc)
      ).rejects.toThrow('Account not found');
    });

    it('should throw NotFoundError if assessment missing', async () => {
      const badAid = new mongoose.Types.ObjectId().toString();
      await expect(
        getQuestionsByAssessmentId(badAid, account._id.toString())
      ).rejects.toThrow('Assessment not found');
    });
  });

  /* -----------------------------------------------------------------------
   * updateQuestionById
   * ----------------------------------------------------------------------- */
  describe('updateQuestionById', () => {
    it('should update a question by ID (MCQ example)', async () => {
      const qid = mcQuestion._id.toString();
      const updated = await updateQuestionById(
        qid,
        {
          text: 'Updated Q text',
          type: 'Multiple Choice',
          isRequired: true,
          isLocked: false,
          isScored: true,
          options: [
            { text: 'OptionA', points: 10 },
            { text: 'OptionB', points: 7 },
          ],
        },
        account._id.toString()
      );
      expect(updated.text).toBe('Updated Q text');
    });

    it('should update a question by ID (MRQ example)', async () => {
      // Let's create a new MRQ question, then update it
      const mrq = await MultipleResponseQuestionModel.create({
        text: 'Pick all that apply',
        type: 'Multiple Response',
        order: 10,
        isRequired: true,
        isLocked: false,
        isScored: true,
        allowNegative: false,
        areWrongAnswersPenalized: false,
        allowPartialMarks: false,
        options: [
          { text: 'Option1', points: 2 },
          { text: 'Option2', points: -1 },
        ],
      });
      // Add to the assessment
      assessment.questions.push(mrq._id);
      await assessment.save();

      const updatedMrq = await updateQuestionById(
        mrq._id.toString(),
        {
          text: 'Updated MRQ text',
          options: [
            { text: 'Option1', points: 2 },
            { text: 'Option3', points: 5 }, // Option2 removed
          ],
        } as Partial<MultipleResponseQuestion>,
        account._id.toString()
      );
      expect(updatedMrq.text).toBe('Updated MRQ text');
    });

    it('should throw NotFoundError if account is missing', async () => {
      const badAcc = new mongoose.Types.ObjectId().toString();
      await expect(
        updateQuestionById(mcQuestion._id.toString(), {}, badAcc)
      ).rejects.toThrow('Account not found');
    });

    it('should throw BadRequestError if account not faculty/admin', async () => {
      const studAcc = await AccountModel.create({
        email: 'stud2@example.com',
        password: 'pass',
        role: 'Student',
      });
      await expect(
        updateQuestionById(mcQuestion._id.toString(), {}, studAcc._id.toString())
      ).rejects.toThrow('Unauthorized');
    });

    it('should throw NotFoundError if question missing', async () => {
      const badQ = new mongoose.Types.ObjectId().toString();
      await expect(
        updateQuestionById(badQ, {}, account._id.toString())
      ).rejects.toThrow('Question not found');
    });

    it('should throw BadRequestError if locked', async () => {
      // Our teamMemberQuestion is locked
      const lockedQ = await TeamMemberSelectionQuestionModel.findOne({});
      await expect(
        updateQuestionById(
          lockedQ!._id.toString(),
          { text: 'Try updating locked question' },
          account._id.toString()
        )
      ).rejects.toThrow('Cannot modify a locked question');
    });

    it('should throw BadRequestError if we try changing question type', async () => {
      await expect(
        updateQuestionById(
          mcQuestion._id.toString(),
          { type: 'Short Response' },
          account._id.toString()
        )
      ).rejects.toThrow('Cannot change the type of an existing question');
    });

    it('should throw NotFoundError after update if updatedQuestion is null', async () => {
      // We'll mock findByIdAndUpdate to return null
      const spy = jest
        .spyOn(MultipleChoiceQuestionModel, 'findByIdAndUpdate')
        .mockResolvedValueOnce(null as any);

      await expect(
        updateQuestionById(
          mcQuestion._id.toString(),
          { text: 'Should fail' },
          account._id.toString()
        )
      ).rejects.toThrow('Question not found after update');

      spy.mockRestore();
    });

    it('should remove or unselect old MCQ answers if options changed', async () => {
      const questionId = mcQuestion._id.toString();
      // Currently: '今日もかわいい', '今日も怖い'
      // We'll remove '今日も怖い'
      await updateQuestionById(
        questionId,
        {
          text: 'Sui-chan is...',
          options: [{ text: '今日もかわいい', points: 10 }],
        },
        account._id.toString()
      );
      // The old MC answer referencing '今日も怖い' is removed
      const leftoverAnswers = await MultipleChoiceAnswerModel.find({
        question: questionId,
      });
      expect(leftoverAnswers.length).toBe(0);
    });

    it('should remove or unselect old MRQ answers if options changed', async () => {
      // Create a new MRQ & an answer referencing two old options
      const newMrq = await MultipleResponseQuestionModel.create({
        text: 'Which ones?',
        type: 'Multiple Response',
        order: 99,
        isRequired: true,
        isLocked: false,
        isScored: true,
        allowNegative: true,
        areWrongAnswersPenalized: true,
        allowPartialMarks: true,
        options: [
          { text: 'OptA', points: 2 },
          { text: 'OptB', points: -1 },
        ],
      });
      assessment.questions.push(newMrq._id);
      await assessment.save();

      const ans = new MultipleResponseAnswerModel({
        question: newMrq._id,
        type: 'Multiple Response Answer',
        values: ['OptA', 'OptB'],
      });
      await ans.save();

      // Now remove 'OptB'
      await updateQuestionById(
        newMrq._id.toString(),
        {
          options: [{ text: 'OptA', points: 2 }, { text: 'OptC', points: 3 }],
        },
        account._id.toString()
      );

      // The answer referencing 'OptB' => it should be removed from the `values`
      const leftAns = await MultipleResponseAnswerModel.findOne({
        question: newMrq._id,
      });
      // Now we only have 'OptA' in values
      expect(leftAns?.values).toEqual(['OptA']);
    });
  });

  /* -----------------------------------------------------------------------
   * deleteQuestionById
   * ----------------------------------------------------------------------- */
  describe('deleteQuestionById', () => {
    it('should delete a question from assessment', async () => {
      const qid = mcQuestion._id.toString();
      await deleteQuestionById(assessment._id.toString(), qid, account._id.toString());
      const updated = await InternalAssessmentModel.findById(assessment._id);
      expect(updated?.questions.length).toBe(1); // TeamMember left
      const foundQ = await QuestionModel.findById(qid);
      expect(foundQ).toBeNull();
    });

    it('should throw NotFoundError if account missing', async () => {
      const noneAcc = new mongoose.Types.ObjectId().toString();
      await expect(
        deleteQuestionById(
          assessment._id.toString(),
          mcQuestion._id.toString(),
          noneAcc
        )
      ).rejects.toThrow('Account not found');
    });

    it('should throw BadRequestError if user is not faculty/admin', async () => {
      const studAcc = await AccountModel.create({
        email: 'stud-deleteQ@example.com',
        password: 'password',
        role: 'Student',
      });
      await expect(
        deleteQuestionById(
          assessment._id.toString(),
          mcQuestion._id.toString(),
          studAcc._id.toString()
        )
      ).rejects.toThrow('Unauthorized');
    });

    it('should throw NotFoundError if assessment missing', async () => {
      const badAid = new mongoose.Types.ObjectId().toString();
      await expect(
        deleteQuestionById(badAid, mcQuestion._id.toString(), account._id.toString())
      ).rejects.toThrow('Assessment not found');
    });

    it('should throw NotFoundError if question missing', async () => {
      const badQid = new mongoose.Types.ObjectId().toString();
      await expect(
        deleteQuestionById(
          assessment._id.toString(),
          badQid,
          account._id.toString()
        )
      ).rejects.toThrow('Question not found');
    });

    it('should throw BadRequestError if question locked', async () => {
      const lockedQ = await TeamMemberSelectionQuestionModel.findOne({});
      await expect(
        deleteQuestionById(
          assessment._id.toString(),
          lockedQ!._id.toString(),
          account._id.toString()
        )
      ).rejects.toThrow('Cannot delete a locked question');
    });

    it('should throw NotFoundError if question not in assessment', async () => {
      // Make a different assessment
      const otherA = await InternalAssessmentModel.create({
        course: course._id,
        assessmentName: 'OtherAssess',
        description: 'desc',
        startDate: new Date(),
        maxMarks: 10,
        scaleToMaxMarks: true,
        granularity: 'team',
        questions: [],
        isReleased: false,
        areSubmissionsEditable: true,
      });
      await expect(
        deleteQuestionById(
          otherA._id.toString(),
          mcQuestion._id.toString(),
          account._id.toString()
        )
      ).rejects.toThrow('Question not associated with this assessment');
    });
  });

  /* -----------------------------------------------------------------------
   * releaseInternalAssessmentById
   * ----------------------------------------------------------------------- */
  describe('releaseInternalAssessmentById', () => {
    it('should release an assessment', async () => {
      const rel = await releaseInternalAssessmentById(
        assessment._id.toString(),
        account._id.toString()
      );
      expect(rel.isReleased).toBe(true);
    });

    it('should throw NotFoundError if account missing', async () => {
      const noneAcc = new mongoose.Types.ObjectId().toString();
      await expect(
        releaseInternalAssessmentById(assessment._id.toString(), noneAcc)
      ).rejects.toThrow('Account not found');
    });

    it('should throw BadRequestError if user not faculty/admin', async () => {
      const studAcc = await AccountModel.create({
        email: 'someguy@example.com',
        password: 'pass',
        role: 'Student',
      });
      await expect(
        releaseInternalAssessmentById(
          assessment._id.toString(),
          studAcc._id.toString()
        )
      ).rejects.toThrow('Unauthorized');
    });

    it('should throw NotFoundError if assessment missing', async () => {
      const badAid = new mongoose.Types.ObjectId().toString();
      await expect(
        releaseInternalAssessmentById(badAid, account._id.toString())
      ).rejects.toThrow('Assessment not found');
    });
  });

  /* -----------------------------------------------------------------------
   * recallInternalAssessmentById
   * ----------------------------------------------------------------------- */
  describe('recallInternalAssessmentById', () => {
    it('should recall a released assessment', async () => {
      // Release first
      await releaseInternalAssessmentById(assessment._id.toString(), account._id.toString());
      const recalled = await recallInternalAssessmentById(
        assessment._id.toString(),
        account._id.toString()
      );
      expect(recalled.isReleased).toBe(false);
    });

    it('should throw NotFoundError if account missing', async () => {
      const noneAcc = new mongoose.Types.ObjectId().toString();
      await expect(
        recallInternalAssessmentById(assessment._id.toString(), noneAcc)
      ).rejects.toThrow('Account not found');
    });

    it('should throw BadRequestError if user not faculty/admin', async () => {
      const studAcc = await AccountModel.create({
        email: 'stud1@example.com',
        password: 'pass',
        role: 'Student',
      });
      await expect(
        recallInternalAssessmentById(
          assessment._id.toString(),
          studAcc._id.toString()
        )
      ).rejects.toThrow('Unauthorized');
    });

    it('should throw NotFoundError if assessment missing', async () => {
      const badAid = new mongoose.Types.ObjectId().toString();
      await expect(
        recallInternalAssessmentById(badAid, account._id.toString())
      ).rejects.toThrow('Assessment not found');
    });
  });

  /* -----------------------------------------------------------------------
   * recaluculateSubmissionsForAssessment
   * ----------------------------------------------------------------------- */
  describe('recaluculateSubmissionsForAssessment', () => {
    it('should recalc submissions for an assessment', async () => {
      // We simply ensure no error is thrown
      await recaluculateSubmissionsForAssessment(
        assessment._id.toString(),
        account._id.toString()
      );
    });

    it('should throw NotFoundError if account missing', async () => {
      const noneAcc = new mongoose.Types.ObjectId().toString();
      await expect(
        recaluculateSubmissionsForAssessment(
          assessment._id.toString(),
          noneAcc
        )
      ).rejects.toThrow('Account not found');
    });

    it('should throw BadRequestError if user not faculty/admin', async () => {
      const studAcc = await AccountModel.create({
        email: 'stud99@example.com',
        password: 'pass',
        role: 'Student',
      });
      await expect(
        recaluculateSubmissionsForAssessment(
          assessment._id.toString(),
          studAcc._id.toString()
        )
      ).rejects.toThrow('Unauthorized');
    });
  });

  /* -----------------------------------------------------------------------
   * reorderQuestions
   * ----------------------------------------------------------------------- */
  describe('reorderQuestions', () => {
    it('should reorder the existing questions', async () => {
      const assess = await InternalAssessmentModel.findById(assessment._id).populate('questions');
      expect(assess?.questions.length).toBe(2);
      const reversed = assess!.questions.map((q: any) => q._id.toString()).reverse();

      const updated = await reorderQuestions(
        assessment._id.toString(),
        reversed,
        account._id.toString()
      );
      const newIds = updated.questions.map((q: any) => q._id.toString());
      expect(newIds).toEqual(reversed);

      // Check .order in each doc
      for (let i = 0; i < reversed.length; i++) {
        const qDoc = await QuestionModel.findById(reversed[i]);
        expect(qDoc?.order).toBe(i + 1);
      }
    });

    it('should throw NotFoundError if account missing', async () => {
      const noneAcc = new mongoose.Types.ObjectId().toString();
      await expect(
        reorderQuestions(assessment._id.toString(), [], noneAcc)
      ).rejects.toThrow('Account not found');
    });

    it('should throw BadRequestError if user is not faculty/admin', async () => {
      const studAcc = await AccountModel.create({
        email: 'stud-reorder@example.com',
        password: 'pwd',
        role: 'Student',
      });
      const docs = await InternalAssessmentModel.findById(assessment._id).populate('questions');
      const qids = docs!.questions.map((q: any) => q._id.toString());

      await expect(
        reorderQuestions(assessment._id.toString(), qids, studAcc._id.toString())
      ).rejects.toThrow('Unauthorized');
    });

    it('should throw NotFoundError if assessment missing', async () => {
      const badAid = new mongoose.Types.ObjectId().toString();
      await expect(reorderQuestions(badAid, [], account._id.toString())).rejects.toThrow(
        'Assessment not found'
      );
    });

    it('should throw BadRequestError if question array length mismatch', async () => {
      // We actually have 2 questions. If we pass array of length 1 => mismatch
      await expect(
        reorderQuestions(assessment._id.toString(), ['something'], account._id.toString())
      ).rejects.toThrow('Question array length mismatch');
    });

    it('should throw BadRequestError if some questions are missing from input', async () => {
      const assessDocs = await InternalAssessmentModel.findById(assessment._id).populate(
        'questions'
      );
      const realIds = assessDocs!.questions.map((q: any) => q._id.toString());
      // Remove one ID => mismatch
      realIds.pop();
      await expect(
        reorderQuestions(assessment._id.toString(), realIds, account._id.toString())
      ).rejects.toThrow();
    });

    it('should throw if question not found in assessment (bogus ID in input)', async () => {
      const assessDocs = await InternalAssessmentModel.findById(assessment._id).populate(
        'questions'
      );
      const realIds = assessDocs!.questions.map((q: any) => q._id.toString());

      // Replace last real ID with bogus
      realIds[1] = new mongoose.Types.ObjectId().toString();
      await expect(
        reorderQuestions(assessment._id.toString(), realIds, account._id.toString())
      ).rejects.toThrow();
    });
  });
});
