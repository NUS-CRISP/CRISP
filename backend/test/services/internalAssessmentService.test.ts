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
  TeamMemberSelectionQuestion,
  ScaleQuestionModel,
  DateQuestionModel,
  LongResponseQuestionModel,
  NumberQuestionModel,
  NUSNETEmailQuestionModel,
  NUSNETIDQuestionModel,
  ShortResponseQuestionModel,
  UndecidedQuestionModel,
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
import UserModel, { User } from '@models/User';
import AssessmentResultModel, {
  AssessmentResult,
} from '@models/AssessmentResult';
import QuestionModel from '@models/Question';
import CourseRole from '@shared/types/auth/CourseRole';
import CrispRole from '@shared/types/auth/CrispRole';

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
  // 1) Faculty account
  const faculty = new UserModel({
    identifier: 'faculty',
    name: 'Test Faculty',
  });
  const facultyAccount = new AccountModel({
    email: 'faculty@example.com',
    password: 'password',
    crispRole: CrispRole.Faculty,
    user: faculty._id,
    isApproved: true,
  });

  // 2) A course
  const course = await CourseModel.create({
    name: 'Introduction to Computer Science',
    code: 'CS101',
    semester: 'Fall 2024',
    startDate: new Date('2024-08-15'),
    courseType: 'Normal',
  });
  course.faculty.push(faculty._id);
  await course.save();
  facultyAccount.courseRoles.push({
    course: course._id.toString(),
    courseRole: CourseRole.Faculty,
  });
  await facultyAccount.save();

  // 3) A student & TA
  const student = await UserModel.create({
    identifier: 'studentUser',
    name: 'Test Student',
  });
  const studentAccount = new AccountModel({
    email: 'student@example.com',
    password: 'password',
    crispRole: CrispRole.Normal,
    user: student._id,
    isApproved: true,
  });
  studentAccount.courseRoles.push({
    course: course._id.toString(),
    courseRole: CourseRole.Student,
  });
  await studentAccount.save();

  const ta = await UserModel.create({
    identifier: 'taUser',
    name: 'Test TA',
  });
  const taAccount = new AccountModel({
    email: 'ta@example.com',
    password: 'password',
    crispRole: CrispRole.Normal,
    user: student._id,
    isApproved: true,
  });
  taAccount.courseRoles.push({
    course: course._id.toString(),
    courseRole: CourseRole.TA,
  });
  await taAccount.save();
  course.students.push(student._id);
  course.TAs.push(ta._id);
  await course.save();

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
  assessment.questionsTotalMarks = 10; // From the question added before this
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
    account: facultyAccount,
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
  let teamMemberQuestion: any;
  let assessment: any;
  let mcQuestion: any;

  beforeAll(async () => {
    // No-op here because we do everything in beforeEach
  });

  beforeEach(async () => {
    ({ course, account, teamSet, mcQuestion, assessment, teamMemberQuestion } =
      await setupData());
  });

  describe('getInternalAssessmentById', () => {
    it('should retrieve an internal assessment by ID (admin)', async () => {
      account.crispRole = CrispRole.Admin;
      await account.save();
      const fetched = await getInternalAssessmentById(
        assessment._id.toString(),
        account._id.toString()
      );
      expect(fetched._id.toString()).toEqual(assessment._id.toString());
    });

    it('should retrieve an internal assessment by ID (Faculty member)', async () => {
      const fetched = await getInternalAssessmentById(
        assessment._id.toString(),
        account._id.toString()
      );
      expect(fetched._id.toString()).toEqual(assessment._id.toString());
    });

    it('should retrieve an internal assessment by ID (Teaching assistant)', async () => {
      account.crispRole = CrispRole.Normal;
      account.courseRoles.filter(
        (r: { course: String; courseRole: String }) =>
          r.course === course._id.toString()
      )[0].courseRole = CourseRole.TA;
      await account.save();
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

    it('should sort results by student name when user is admin/faculty', async () => {
      // Create additional students
      const studentB = await UserModel.create({
        identifier: 'studentB',
        name: 'Alice Brown',
      });
      const studentC = await UserModel.create({
        identifier: 'studentC',
        name: 'Charlie Davis',
      });
      // Create AssessmentResult documents for the new students
      const resultB = await AssessmentResultModel.create({
        assessment: assessment._id,
        student: studentB._id,
        marker: account.user, // Assuming 'account.user' is a valid marker
        marks: [],
        averageScore: 7,
      });

      const resultC = await AssessmentResultModel.create({
        assessment: assessment._id,
        student: studentC._id,
        marker: account.user,
        marks: [],
        averageScore: 9,
      });

      // Update the assessment's results array
      assessment.results.push(resultB._id, resultC._id);
      await assessment.save();

      const fetched = await getInternalAssessmentById(
        assessment._id.toString(),
        account._id.toString()
      );

      const fetchedResults = fetched.results as AssessmentResult[];

      // Extract student names from the results
      const studentNames = fetchedResults.map(
        res => (res.student as User).name
      );

      // Check if the names are sorted in ascending order
      const sortedNames = [...studentNames].sort((a, b) => a.localeCompare(b));
      expect(studentNames).toEqual(sortedNames);
    });
  });

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
      ).rejects.toThrow();
    });

    it('should throw BadRequestError if account is not faculty/admin', async () => {
      const studentAcc = await AccountModel.create({
        email: 'student-acc@example.com',
        password: 'password',
        crispRole: CrispRole.Normal,
        courseRoles: {
          course: course._id.toString(),
          courseRole: CourseRole.Student,
        },
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

  describe('deleteInternalAssessmentById', () => {
    it('should delete an assessment by ID', async () => {
      await deleteInternalAssessmentById(assessment._id.toString());
      const check = await InternalAssessmentModel.findById(assessment._id);
      expect(check).toBeNull();
    });

    it('should throw NotFoundError if assessment is missing', async () => {
      const invalidAId = new mongoose.Types.ObjectId().toString();
      await expect(deleteInternalAssessmentById(invalidAId)).rejects.toThrow(
        'Assessment not found'
      );
    });
  });

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
      await expect(
        addInternalAssessmentsToCourse(course._id.toString(), [
          {
            assessmentName: 'Midterm Exam', // duplicate
            description: 'desc',
            startDate: new Date(),
            scaleToMaxMarks: true,
            granularity: 'team',
            teamSetName: teamSet.name,
            areSubmissionsEditable: true,
          },
        ])
      ).rejects.toThrow();
      const c = await CourseModel.findById(course._id).populate(
        'internalAssessments'
      );
      // Should remain 1
      expect(c?.internalAssessments.length).toBe(1);
    });

    it('should skip creation if TeamSet is missing', async () => {
      // We'll pass a non-existent teamSetName => logs error => skip
      await expect(
        addInternalAssessmentsToCourse(course._id.toString(), [
          {
            assessmentName: 'AnotherAssess',
            description: 'desc',
            startDate: new Date(),
            scaleToMaxMarks: true,
            granularity: 'team',
            teamSetName: 'MissingTeamSet',
            areSubmissionsEditable: true,
          },
        ])
      ).rejects.toThrow();
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

    it('should log an error when createAssignmentSet fails', async () => {
      // Mock createAssignmentSet to throw an error
      const mockCreateAssignmentSet = jest
        .spyOn(
          require('../../services/assessmentAssignmentSetService'),
          'createAssignmentSet'
        )
        .mockImplementationOnce(() => {
          throw new Error('Mocked Assignment Set Creation Failure');
        });

      // Spy on console.error
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const startDate = new Date();
      startDate.setUTCFullYear(startDate.getUTCFullYear() - 1);

      // Attempt to add a new assessment that will trigger createAssignmentSet failure
      await addInternalAssessmentsToCourse(course._id.toString(), [
        {
          assessmentName: 'Final Exam',
          description: 'Final assessment desc',
          startDate,
          maxMarks: 50,
          scaleToMaxMarks: true,
          granularity: 'individual',
          teamSetName: teamSet.name,
          areSubmissionsEditable: true,
        },
      ]);

      // Expect console.error to have been called with the appropriate message
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Failed to create AssessmentAssignmentSet for assessment'
        ),
        expect.any(Error)
      );

      // Restore mocks
      mockCreateAssignmentSet.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('addQuestionToAssessment', () => {
    it('should add a Multiple Choice question', async () => {
      const qData = {
        type: 'Multiple Choice',
        text: '2+2=?',
        options: [{ text: '4', points: 5 }],
        isScored: true,
        order: 3,
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

    it('should throw BadRequestError when scored MCQ question added without point value in answer choices', async () => {
      const qData = {
        type: 'Multiple Choice',
        text: '2+2=?',
        options: [{ text: '4' }], // Missing 'points'
        isScored: true,
        order: 3,
      } as Partial<MultipleChoiceQuestion>;

      await expect(
        addQuestionToAssessment(
          assessment._id.toString(),
          qData,
          account._id.toString()
        )
      ).rejects.toThrow(
        'Each option must have a points value when scoring is enabled'
      );
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
        order: 3,
      };
      const q = await addQuestionToAssessment(
        assessment._id.toString(),
        qData,
        account._id.toString()
      );
      expect(q.type).toBe('Multiple Response');
    });

    it('should throw BadRequestError when adding scored MRQ question with option missing points', async () => {
      const qData = {
        type: 'Multiple Response',
        text: 'Pick items',
        options: [
          { text: 'OptionA' }, // Missing 'points'
          { text: 'OptionB', points: -1 },
        ],
        isScored: true,
        allowNegative: true,
        areWrongAnswersPenalized: true,
        allowPartialMarks: true,
        order: 3,
      } as Partial<MultipleResponseQuestion>;

      await expect(
        addQuestionToAssessment(
          assessment._id.toString(),
          qData,
          account._id.toString()
        )
      ).rejects.toThrow(
        'Each option must have a points value when scoring is enabled'
      );
    });

    it('should throw BadRequestError when adding scored MRQ question without allowNegative', async () => {
      const qData = {
        type: 'Multiple Response',
        text: 'Pick items',
        options: [
          { text: 'OptionA', points: 2 },
          { text: 'OptionB', points: -1 },
        ],
        isScored: true,
        // Missing 'allowNegative'
        areWrongAnswersPenalized: true,
        allowPartialMarks: true,
        order: 3,
      } as Partial<MultipleResponseQuestion>;

      await expect(
        addQuestionToAssessment(
          assessment._id.toString(),
          qData,
          account._id.toString()
        )
      ).rejects.toThrow(
        'allowNegative must be specified when scoring is enabled for Multiple Response questions'
      );
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
        order: 3,
      };
      const q = await addQuestionToAssessment(
        assessment._id.toString(),
        qData,
        account._id.toString()
      );
      expect(q.type).toBe('Scale');
    });

    it('should throw BadRequestError when Scale question has no labels', async () => {
      const qData = {
        type: 'Scale',
        text: 'Rate your experience',
        scaleMax: 5,
        labels: [], // No labels
        isScored: true,
        order: 3,
      } as Partial<ScaleQuestion>;
      await expect(
        addQuestionToAssessment(
          assessment._id.toString(),
          qData,
          account._id.toString()
        )
      ).rejects.toThrow('At least two labels are required for Scale questions');
    });

    it('should throw BadRequestError when Scale question only has 1 label', async () => {
      const qData = {
        type: 'Scale',
        text: 'Rate your experience',
        scaleMax: 5,
        labels: [{ value: 5, label: 'Good', points: 10 }], // Only one label
        isScored: true,
        order: 3,
      } as Partial<ScaleQuestion>;
      await expect(
        addQuestionToAssessment(
          assessment._id.toString(),
          qData,
          account._id.toString()
        )
      ).rejects.toThrow('At least two labels are required for Scale questions');
    });

    it('should throw BadRequestError when Scale question is missing scaleMax', async () => {
      const qData = {
        type: 'Scale',
        text: 'Rate your experience',
        // Missing 'scaleMax'
        labels: [
          { value: 1, label: 'Bad', points: 4 },
          { value: 5, label: 'Good', points: 10 },
        ],
        isScored: true,
        order: 3,
      } as Partial<ScaleQuestion>;
      await expect(
        addQuestionToAssessment(
          assessment._id.toString(),
          qData,
          account._id.toString()
        )
      ).rejects.toThrow('scaleMax is required for Scale questions');
    });

    it('should throw BadRequestError when scored Scale question is missing point value in labels', async () => {
      const qData = {
        type: 'Scale',
        text: 'Rate your experience',
        scaleMax: 5,
        labels: [
          { value: 1, label: 'Bad' }, // Missing 'points'
          { value: 5, label: 'Good', points: 10 },
        ],
        isScored: true,
        order: 3,
      } as Partial<ScaleQuestion>;
      await expect(
        addQuestionToAssessment(
          assessment._id.toString(),
          qData,
          account._id.toString()
        )
      ).rejects.toThrow(
        'Each label must have a points value when scoring is enabled'
      );
    });

    it('should add a Number question', async () => {
      const qData: Partial<NumberQuestion> = {
        type: 'Number',
        text: 'Enter a number up to 100',
        maxNumber: 100,
        isScored: true,
        scoringMethod: 'direct',
        maxPoints: 10,
        order: 3,
      };
      const q = await addQuestionToAssessment(
        assessment._id.toString(),
        qData,
        account._id.toString()
      );
      expect(q.type).toBe('Number');
    });

    it('should throw BadRequestError when Number question is missing maxPoints for direct scoring', async () => {
      const qData = {
        type: 'Number',
        text: 'Enter a number up to 100',
        maxNumber: 100,
        isScored: true,
        scoringMethod: 'direct',
        // Missing 'maxPoints'
        order: 3,
      } as Partial<NumberQuestion>;
      await expect(
        addQuestionToAssessment(
          assessment._id.toString(),
          qData,
          account._id.toString()
        )
      ).rejects.toThrow('maxPoints is required for direct scoring method');
    });

    it('should throw BadRequestError when Number question isScored but missing scoringMethod', async () => {
      const qData = {
        type: 'Number',
        text: 'Enter a number up to 100',
        maxNumber: 100,
        isScored: true,
        // Missing 'scoringMethod'
        order: 3,
      } as Partial<NumberQuestion>;
      await expect(
        addQuestionToAssessment(
          assessment._id.toString(),
          qData,
          account._id.toString()
        )
      ).rejects.toThrow(
        'scoringMethod is required when scoring is enabled for Number questions'
      );
    });

    it('should throw BadRequestError when Number question isScored=range but missing scoringRanges', async () => {
      const qData = {
        type: 'Number',
        text: 'Enter a number in range',
        maxNumber: 100,
        isScored: true,
        scoringMethod: 'range',
        // Missing 'scoringRanges'
        order: 3,
      } as Partial<NumberQuestion>;
      await expect(
        addQuestionToAssessment(
          assessment._id.toString(),
          qData,
          account._id.toString()
        )
      ).rejects.toThrow('scoringRanges are required for range scoring method');
    });

    it('should throw BadRequestError when Number question has invalid scoringRanges', async () => {
      const qData = {
        type: 'Number',
        text: 'Enter a number in range',
        maxNumber: 100,
        isScored: true,
        scoringMethod: 'range',
        scoringRanges: [
          { minValue: 0, maxValue: 50, points: 5 },
          { minValue: 51, maxValue: 'invalid' as any, points: 10 }, // Invalid 'maxValue'
        ],
        order: 3,
      } as Partial<NumberQuestion>;
      await expect(
        addQuestionToAssessment(
          assessment._id.toString(),
          qData,
          account._id.toString()
        )
      ).rejects.toThrow(
        'Each scoring range must have minValue, maxValue, and points'
      );
    });

    it('should throw BadRequestError when Number question scoringRanges are missing points', async () => {
      const qData = {
        type: 'Number',
        text: 'Enter a number in range',
        maxNumber: 100,
        isScored: true,
        scoringMethod: 'range',
        scoringRanges: [
          { minValue: 0, maxValue: 50 }, // Missing 'points'
          { minValue: 51, maxValue: 100, points: 10 },
        ],
        order: 3,
      } as Partial<NumberQuestion>;
      await expect(
        addQuestionToAssessment(
          assessment._id.toString(),
          qData,
          account._id.toString()
        )
      ).rejects.toThrow(
        'Each scoring range must have minValue, maxValue, and points'
      );
    });

    it('should add a NUSNET ID question', async () => {
      const qData: Partial<NUSNETIDQuestion> = {
        type: 'NUSNET ID',
        text: 'Enter your ID',
        shortResponsePlaceholder: 'e0123456',
        order: 3,
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
        order: 3,
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
        order: 3,
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
        order: 3,
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
        order: 3,
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
        order: 3,
      };
      const q = await addQuestionToAssessment(
        assessment._id.toString(),
        qData,
        account._id.toString()
      );
      expect(q.type).toBe('Undecided');
    });

    it('should throw NotFoundError if account is missing', async () => {
      const missingAcc = new mongoose.Types.ObjectId().toString();
      await expect(
        addQuestionToAssessment(assessment._id.toString(), {}, missingAcc)
      ).rejects.toThrow('Account not found');
    });

    it('should throw BadRequestError if account is not admin/faculty', async () => {
      const studAcc = await AccountModel.create({
        email: 'stud@example.com',
        password: 'pass',
        crispRole: CrispRole.Normal,
        courseRoles: {
          course: course._id.toString(),
          courseRole: CourseRole.Student,
        },
      });
      await expect(
        addQuestionToAssessment(
          assessment._id.toString(),
          {},
          studAcc._id.toString()
        )
      ).rejects.toThrow('Unauthorized');
    });

    it('should throw NotFoundError if assessment is missing', async () => {
      const invalidAid = new mongoose.Types.ObjectId().toString();
      await expect(
        addQuestionToAssessment(
          invalidAid,
          { type: 'Multiple Choice', text: '??' },
          account._id.toString()
        )
      ).rejects.toThrow('Assessment not found');
    });

    it('should throw BadRequestError if type or text is missing', async () => {
      // Missing 'type'
      await expect(
        addQuestionToAssessment(
          assessment._id.toString(),
          { text: 'No type' },
          account._id.toString()
        )
      ).rejects.toThrow('Both type and text fields are required');

      // Missing 'text'
      await expect(
        addQuestionToAssessment(
          assessment._id.toString(),
          { type: 'Multiple Choice' },
          account._id.toString()
        )
      ).rejects.toThrow('Both type and text fields are required');
    });

    it('should validate specialized fields for Multiple Response questions', async () => {
      // Empty options array
      await expect(
        addQuestionToAssessment(
          assessment._id.toString(),
          {
            type: 'Multiple Response',
            text: 'Pick some',
            options: [],
            isScored: true,
            allowNegative: true,
            areWrongAnswersPenalized: false,
            allowPartialMarks: false,
          },
          account._id.toString()
        )
      ).rejects.toThrow('Options are required for Multiple Response questions');

      // Options present but missing 'points' in one option
      await expect(
        addQuestionToAssessment(
          assessment._id.toString(),
          {
            type: 'Multiple Response',
            text: 'Pick some',
            options: [{ text: 'Option1' }, { text: 'Option2', points: 3 }],
            isScored: true,
            allowNegative: true,
            areWrongAnswersPenalized: false,
            allowPartialMarks: false,
          } as Partial<MultipleResponseQuestion>,
          account._id.toString()
        )
      ).rejects.toThrow(
        'Each option must have a points value when scoring is enabled'
      );
    });

    it('should validate specialized fields for Scale questions', async () => {
      // Labels present but one label missing 'points'
      await expect(
        addQuestionToAssessment(
          assessment._id.toString(),
          {
            type: 'Scale',
            text: 'Rate something',
            scaleMax: 10,
            labels: [
              { value: 1, label: 'Poor' },
              { value: 10, label: 'Excellent', points: 5 },
            ],
            isScored: true,
            order: 3,
          } as Partial<ScaleQuestion>,
          account._id.toString()
        )
      ).rejects.toThrow(
        'Each label must have a points value when scoring is enabled'
      );

      // scaleMax is not a number
      await expect(
        addQuestionToAssessment(
          assessment._id.toString(),
          {
            type: 'Scale',
            text: 'Rate something',
            scaleMax: 'Ten' as any, // Invalid type
            labels: [
              { value: 1, label: 'Poor', points: 0 },
              { value: 10, label: 'Excellent', points: 5 },
            ],
            isScored: true,
            order: 3,
          } as Partial<ScaleQuestion>,
          account._id.toString()
        )
      ).rejects.toThrow('scaleMax is required for Scale questions');
    });

    it('should validate specialized fields for Number questions with scoringMethod=range', async () => {
      // scoringMethod=range but scoringRanges missing
      await expect(
        addQuestionToAssessment(
          assessment._id.toString(),
          {
            type: 'Number',
            text: 'Enter a number',
            maxNumber: 100,
            isScored: true,
            scoringMethod: 'range',
            // Missing scoringRanges
            order: 3,
          } as Partial<NumberQuestion>,
          account._id.toString()
        )
      ).rejects.toThrow('scoringRanges are required for range scoring method');

      // scoringRanges present but one range missing 'points'
      await expect(
        addQuestionToAssessment(
          assessment._id.toString(),
          {
            type: 'Number',
            text: 'Enter a number',
            maxNumber: 100,
            isScored: true,
            scoringMethod: 'range',
            scoringRanges: [
              { minValue: 0, maxValue: 50, points: 5 },
              { minValue: 51, maxValue: 100 }, // Missing 'points'
            ],
            order: 3,
          } as Partial<NumberQuestion>,
          account._id.toString()
        )
      ).rejects.toThrow(
        'Each scoring range must have minValue, maxValue, and points'
      );

      // scoringRanges with non-number 'minValue'
      await expect(
        addQuestionToAssessment(
          assessment._id.toString(),
          {
            type: 'Number',
            text: 'Enter a number',
            maxNumber: 100,
            isScored: true,
            scoringMethod: 'range',
            scoringRanges: [
              { minValue: 'zero' as any, maxValue: 50, points: 5 },
              { minValue: 51, maxValue: 100, points: 10 },
            ],
            order: 3,
          } as Partial<NumberQuestion>,
          account._id.toString()
        )
      ).rejects.toThrow(
        'Each scoring range must have minValue, maxValue, and points'
      );
    });

    it('should create a Team Member Selection question correctly', async () => {
      const qData: Partial<TeamMemberSelectionQuestion> = {
        type: 'Team Member Selection',
        text: 'Select team members',
        isLocked: false,
        isRequired: true,
        order: 3,
      };
      const q = await addQuestionToAssessment(
        assessment._id.toString(),
        qData,
        account._id.toString()
      );
      expect(q.type).toBe('Team Member Selection');
      const updated = await InternalAssessmentModel.findById(assessment._id);
      expect(updated?.questions.length).toBe(3); // was 2 -> now 3
    });

    it('should calculate addedMaxScore correctly for Multiple Choice questions', async () => {
      const qData: Partial<MultipleChoiceQuestion> = {
        type: 'Multiple Choice',
        text: 'What is the capital of France?',
        options: [
          { text: 'Paris', points: 10 },
          { text: 'London', points: 5 },
        ],
        isScored: true,
        order: 3,
      } as Partial<MultipleChoiceQuestion>;

      await addQuestionToAssessment(
        assessment._id.toString(),
        qData,
        account._id.toString()
      );

      // The highest points is 10
      const updatedAssessment = await InternalAssessmentModel.findById(
        assessment._id
      );
      expect(updatedAssessment?.questionsTotalMarks).toBe(10 + 10); // Assuming previous total was 10
    });

    it('should calculate addedMaxScore correctly for Multiple Response questions', async () => {
      const qData: Partial<MultipleResponseQuestion> = {
        type: 'Multiple Response',
        text: 'Select all that apply',
        options: [
          { text: 'Option A', points: 3 },
          { text: 'Option B', points: -2 },
          { text: 'Option C', points: 5 },
        ],
        isScored: true,
        allowNegative: true,
        areWrongAnswersPenalized: true,
        allowPartialMarks: true,
        order: 3,
      } as Partial<MultipleResponseQuestion>;

      await addQuestionToAssessment(
        assessment._id.toString(),
        qData,
        account._id.toString()
      );

      // Sum of positive points: 3 + 5 = 8
      const updatedAssessment = await InternalAssessmentModel.findById(
        assessment._id
      );
      expect(updatedAssessment?.questionsTotalMarks).toBe(10 + 8); // Assuming previous total was 10
    });

    it('should calculate addedMaxScore correctly for Scale questions', async () => {
      const qData: Partial<ScaleQuestion> = {
        type: 'Scale',
        text: 'Rate the course',
        scaleMax: 5,
        labels: [
          { value: 1, label: 'Very Poor', points: 0 },
          { value: 3, label: 'Average', points: 5 },
          { value: 5, label: 'Excellent', points: 10 },
        ],
        isScored: true,
        order: 3,
      } as Partial<ScaleQuestion>;

      await addQuestionToAssessment(
        assessment._id.toString(),
        qData,
        account._id.toString()
      );

      // The last label has 10 points
      const updatedAssessment = await InternalAssessmentModel.findById(
        assessment._id
      );
      expect(updatedAssessment?.questions.length).toBe(3);
      expect(updatedAssessment?.questionsTotalMarks).toBe(10 + 10); // Assuming previous total was 10
    });

    it('should calculate addedMaxScore correctly for Number questions with direct scoring', async () => {
      const qData: Partial<NumberQuestion> = {
        type: 'Number',
        text: 'Enter your age',
        maxNumber: 120,
        isScored: true,
        scoringMethod: 'direct',
        maxPoints: 10,
        order: 3,
      } as Partial<NumberQuestion>;

      await addQuestionToAssessment(
        assessment._id.toString(),
        qData,
        account._id.toString()
      );

      // maxPoints = 10
      const updatedAssessment = await InternalAssessmentModel.findById(
        assessment._id
      );
      expect(updatedAssessment?.questionsTotalMarks).toBe(10 + 10); // Assuming previous total was 10
    });

    it('should calculate addedMaxScore correctly for Number questions with range scoring', async () => {
      const qData: Partial<NumberQuestion> = {
        type: 'Number',
        text: 'Enter your score',
        maxNumber: 100,
        isScored: true,
        scoringMethod: 'range',
        scoringRanges: [
          { minValue: 0, maxValue: 50, points: 5 },
          { minValue: 51, maxValue: 100, points: 10 },
        ],
        order: 3,
      } as Partial<NumberQuestion>;

      await addQuestionToAssessment(
        assessment._id.toString(),
        qData,
        account._id.toString()
      );

      // Last range has 10 points
      const updatedAssessment = await InternalAssessmentModel.findById(
        assessment._id
      );
      expect(updatedAssessment?.questionsTotalMarks).toBe(10 + 10); // Assuming previous total was 10
    });

    it('should throw BadRequestError when adding Team Member Selection question without required fields', async () => {
      const qData = {
        type: 'Team Member Selection',
        // Missing 'text' and 'isRequired'
        order: 3,
      } as Partial<TeamMemberSelectionQuestion>;

      await expect(
        addQuestionToAssessment(
          assessment._id.toString(),
          qData,
          account._id.toString()
        )
      ).rejects.toThrow('Both type and text fields are required');
    });

    it('should handle adding a question with an unexpected type gracefully', async () => {
      const qData = {
        type: 'Unknown Type',
        text: 'This is an unknown question type',
        order: 3,
      } as any;

      // Depending on your implementation, this might default to 'Undecided' or throw an error
      await expect(
        addQuestionToAssessment(
          assessment._id.toString(),
          qData,
          account._id.toString()
        )
      ).rejects.toThrow();
    });
  });

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

  describe('updateQuestionById', () => {
    describe('Successful Updates', () => {
      it('should update a Multiple Choice question by ID', async () => {
        const qid = mcQuestion._id.toString();
        const updated = await updateQuestionById(
          qid,
          {
            text: 'Updated MCQ text',
            isRequired: false,
            options: [
              { text: 'Option A', points: 8 },
              { text: 'Option B', points: 10 },
              { text: 'Option C', points: 6 },
            ],
          },
          account._id.toString()
        );
        expect(updated.text).toBe('Updated MCQ text');
        expect((updated as any).options.length).toBe(3);

        // Verify assessment's questionsTotalMarks updated correctly
        const updatedAssessment = await InternalAssessmentModel.findById(
          assessment._id
        );
        // Original mcQuestion had max points 10, updated has max 10
        // Assuming initial questionsTotalMarks was correctly set to 10
        expect(updatedAssessment?.questionsTotalMarks).toBe(10); // No change in max points
      });

      it('should update a Multiple Response question by ID', async () => {
        // Create a new MRQ question
        const mrq = await MultipleResponseQuestionModel.create({
          text: 'Select applicable options',
          type: 'Multiple Response',
          order: 5,
          isRequired: true,
          isLocked: false,
          isScored: true,
          allowNegative: true,
          areWrongAnswersPenalized: true,
          allowPartialMarks: true,
          options: [
            { text: 'Option 1', points: 3 },
            { text: 'Option 2', points: -2 },
          ],
        });
        assessment.questions.push(mrq._id);
        assessment.questionsTotalMarks += 3;
        await assessment.save();

        const updated = await updateQuestionById(
          mrq._id.toString(),
          {
            text: 'Updated MRQ text',
            options: [
              { text: 'Option 1', points: 3 },
              { text: 'Option 3', points: 5 },
              { text: 'Option 4', points: -1 },
            ],
          },
          account._id.toString()
        );
        expect(updated.text).toBe('Updated MRQ text');
        expect((updated as any).options.length).toBe(3);

        // Verify assessment's questionsTotalMarks updated correctly
        const updatedAssessment = await InternalAssessmentModel.findById(
          assessment._id
        );
        // Original MRQ had sum of positive points = 3
        // Updated MRQ has sum of positive points = 3 + 5 = 8
        // Assuming initial questionsTotalMarks was 10 (from mcQuestion)
        expect(updatedAssessment?.questionsTotalMarks).toBe(10 + 8); // Total: 18
      });

      it('should update a Scale question by ID', async () => {
        // Create a Scale question
        const scaleQ = await ScaleQuestionModel.create({
          text: 'Rate the course',
          type: 'Scale',
          order: 6,
          isRequired: true,
          isLocked: false,
          isScored: true,
          scaleMax: 5,
          labels: [
            { value: 1, label: 'Poor', points: 0 },
            { value: 5, label: 'Excellent', points: 10 },
          ],
        });
        assessment.questions.push(scaleQ._id);
        assessment.questionsTotalMarks += 10;
        await assessment.save();

        const updated = await updateQuestionById(
          scaleQ._id.toString(),
          {
            labels: [
              { value: 1, label: 'Very Poor', points: 0 },
              { value: 3, label: 'Average', points: 5 },
              { value: 5, label: 'Excellent', points: 15 },
            ],
          },
          account._id.toString()
        );
        expect((updated as ScaleQuestion).labels.length).toBe(3);
        expect((updated as ScaleQuestion).labels[2].points).toBe(15);

        // Verify assessment's questionsTotalMarks updated correctly
        const updatedAssessment = await InternalAssessmentModel.findById(
          assessment._id
        );
        // Original Scale had 10 points, updated to 15
        expect(updatedAssessment?.questionsTotalMarks).toBe(10 + 15); // Total: 25
      });

      it('should update a Number question with direct scoring by ID', async () => {
        // Create a Number question
        const numberQ = await NumberQuestionModel.create({
          text: 'Enter your age',
          type: 'Number',
          order: 7,
          isRequired: true,
          isLocked: false,
          isScored: true,
          maxNumber: 120,
          scoringMethod: 'direct',
          maxPoints: 10,
        });
        assessment.questions.push(numberQ._id);
        assessment.questionsTotalMarks += 10; // Initial max points from Number
        await assessment.save();

        const updated = await updateQuestionById(
          numberQ._id.toString(),
          {
            maxPoints: 15, // Increased maxPoints
          },
          account._id.toString()
        );
        expect((updated as NumberQuestion).maxPoints).toBe(15);

        // Verify assessment's questionsTotalMarks updated correctly
        const updatedAssessment = await InternalAssessmentModel.findById(
          assessment._id
        );
        // Original Number had 10 points, updated to 15
        expect(updatedAssessment?.questionsTotalMarks).toBe(10 + 15); // Total: 25
      });

      it('should update a Number question with range scoring by ID', async () => {
        // Create a Number question with range scoring
        const numberQ = await NumberQuestionModel.create({
          text: 'Enter your score',
          type: 'Number',
          order: 8,
          isRequired: true,
          isLocked: false,
          isScored: true,
          maxNumber: 100,
          scoringMethod: 'range',
          scoringRanges: [
            { minValue: 0, maxValue: 50, points: 5 },
            { minValue: 51, maxValue: 100, points: 10 },
          ],
        });
        assessment.questions.push(numberQ._id);
        assessment.questionsTotalMarks += 10; // Initial max points from Number (last range)
        await assessment.save();

        const updated = await updateQuestionById(
          numberQ._id.toString(),
          {
            scoringRanges: [
              { minValue: 0, maxValue: 60, points: 6 },
              { minValue: 61, maxValue: 100, points: 12 },
            ],
          },
          account._id.toString()
        );
        expect((updated as NumberQuestion).scoringRanges!.length).toBe(2);
        expect((updated as NumberQuestion).scoringRanges![1].points).toBe(12);

        // Verify assessment's questionsTotalMarks updated correctly
        const updatedAssessment = await InternalAssessmentModel.findById(
          assessment._id
        );
        // Original Number had 10 points, updated to 12
        expect(updatedAssessment?.questionsTotalMarks).toBe(10 + 12); // Total: 22
      });

      it('should update a Short Response question by ID', async () => {
        // Create a Short Response question
        const shortRespQ = await ShortResponseQuestionModel.create({
          text: 'Briefly describe your experience',
          type: 'Short Response',
          order: 9,
          isRequired: true,
          isLocked: false,
          shortResponsePlaceholder: 'Your response here',
        });
        assessment.questions.push(shortRespQ._id);
        await assessment.save();

        const updated = await updateQuestionById(
          shortRespQ._id.toString(),
          {
            text: 'Updated Short Response text',
            shortResponsePlaceholder: 'Updated placeholder',
          },
          account._id.toString()
        );
        expect((updated as ShortResponseQuestion).text).toBe(
          'Updated Short Response text'
        );
        expect(
          (updated as ShortResponseQuestion).shortResponsePlaceholder
        ).toBe('Updated placeholder');
      });

      it('should update a Long Response question by ID', async () => {
        // Create a Long Response question
        const longRespQ = await LongResponseQuestionModel.create({
          text: 'Elaborate on your project',
          type: 'Long Response',
          order: 10,
          isRequired: true,
          isLocked: false,
          longResponsePlaceholder: 'Detailed explanation here',
        });
        assessment.questions.push(longRespQ._id);
        await assessment.save();

        const updated = await updateQuestionById(
          longRespQ._id.toString(),
          {
            text: 'Updated Long Response text',
            longResponsePlaceholder: 'Updated placeholder',
          },
          account._id.toString()
        );
        expect((updated as LongResponseQuestion).text).toBe(
          'Updated Long Response text'
        );
        expect((updated as LongResponseQuestion).longResponsePlaceholder).toBe(
          'Updated placeholder'
        );
      });

      it('should update a Date question by ID', async () => {
        // Create a Date question
        const dateQ = await DateQuestionModel.create({
          text: 'Select your availability',
          type: 'Date',
          order: 11,
          isRequired: true,
          isLocked: false,
          isRange: true,
        });
        assessment.questions.push(dateQ._id);
        await assessment.save();

        const updated = await updateQuestionById(
          dateQ._id.toString(),
          {
            isRange: false,
          },
          account._id.toString()
        );
        expect((updated as DateQuestion).isRange).toBe(false);
      });

      it('should update a Team Member Selection question by ID', async () => {
        // Create a Team Member Selection question
        const teamMemQ = await TeamMemberSelectionQuestionModel.create({
          text: 'Select team members',
          type: 'Team Member Selection',
          order: 12,
          isRequired: true,
          isLocked: false,
        });
        assessment.questions.push(teamMemQ._id);
        await assessment.save();

        const updated = await updateQuestionById(
          teamMemQ._id.toString(),
          {
            text: 'Updated Team Member Selection text',
          },
          account._id.toString()
        );
        expect((updated as TeamMemberSelectionQuestion).text).toBe(
          'Updated Team Member Selection text'
        );
      });

      it('should update a NUSNET ID question by ID', async () => {
        // Create a NUSNET ID question
        const nusnetIDQ = await NUSNETIDQuestionModel.create({
          text: 'Enter your NUSNET ID',
          type: 'NUSNET ID',
          order: 13,
          isRequired: true,
          isLocked: false,
          shortResponsePlaceholder: 'e.g., e0123456',
        });
        assessment.questions.push(nusnetIDQ._id);
        await assessment.save();

        const updated = await updateQuestionById(
          nusnetIDQ._id.toString(),
          {
            shortResponsePlaceholder: 'e.g., e0654321',
          },
          account._id.toString()
        );
        expect((updated as NUSNETIDQuestion).shortResponsePlaceholder).toBe(
          'e.g., e0654321'
        );
      });

      it('should update a NUSNET Email question by ID', async () => {
        // Create a NUSNET Email question
        const nusnetEmailQ = await NUSNETEmailQuestionModel.create({
          text: 'Enter your NUSNET Email',
          type: 'NUSNET Email',
          order: 14,
          isRequired: true,
          isLocked: false,
          shortResponsePlaceholder: 'e.g., xxxx@u.nus.edu',
        });
        assessment.questions.push(nusnetEmailQ._id);
        await assessment.save();

        const updated = await updateQuestionById(
          nusnetEmailQ._id.toString(),
          {
            shortResponsePlaceholder: 'e.g., john.doe@u.nus.edu',
          },
          account._id.toString()
        );
        expect((updated as NUSNETEmailQuestion).shortResponsePlaceholder).toBe(
          'e.g., john.doe@u.nus.edu'
        );
      });

      it('should update an Undecided question by ID', async () => {
        // Create an Undecided question
        const undecidedQ = await UndecidedQuestionModel.create({
          text: 'Describe your thoughts',
          type: 'Undecided',
          order: 15,
          isRequired: true,
          isLocked: false,
        });
        assessment.questions.push(undecidedQ._id);
        await assessment.save();

        const updated = await updateQuestionById(
          undecidedQ._id.toString(),
          {
            text: 'Updated Undecided question text',
          },
          account._id.toString()
        );
        expect((updated as UndecidedQuestion).text).toBe(
          'Updated Undecided question text'
        );
      });
    });

    describe('Exception Scenarios', () => {
      it('should throw NotFoundError if account is missing', async () => {
        const missingAcc = new mongoose.Types.ObjectId().toString();
        await expect(
          updateQuestionById(mcQuestion._id.toString(), {}, missingAcc)
        ).rejects.toThrow('Account not found');
      });

      it('should throw BadRequestError if account is not admin/faculty', async () => {
        const studAcc = await AccountModel.create({
          email: 'stud2@example.com',
          password: 'pass',
          crispRole: CrispRole.Normal,
          courseRoles: {
            course: course._id.toString(),
            courseRole: CourseRole.Student,
          },
        });
        await expect(
          updateQuestionById(
            mcQuestion._id.toString(),
            {},
            studAcc._id.toString()
          )
        ).rejects.toThrow('Unauthorized');
      });

      it('should throw NotFoundError if question is missing', async () => {
        const badQ = new mongoose.Types.ObjectId().toString();
        await expect(
          updateQuestionById(badQ, {}, account._id.toString())
        ).rejects.toThrow('Question not found');
      });

      it('should throw BadRequestError if question is locked', async () => {
        // Our teamMemberQuestion is locked
        await teamMemberQuestion.updateOne({ isLocked: true });
        await expect(
          updateQuestionById(
            teamMemberQuestion._id.toString(),
            { text: 'Attempt to update locked question' },
            account._id.toString()
          )
        ).rejects.toThrow('Cannot modify a locked question');
      });

      it('should throw BadRequestError if attempting to change question type', async () => {
        await expect(
          updateQuestionById(
            mcQuestion._id.toString(),
            { type: 'Short Response' }, // Attempting to change type
            account._id.toString()
          )
        ).rejects.toThrow('Cannot change the type of an existing question');
      });

      it('should throw NotFoundError after update if updatedQuestion is null', async () => {
        // Mock findByIdAndUpdate to return null
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

      describe('Validation Errors for Specific Question Types', () => {
        it('should throw BadRequestError when updating MCQ without points in options', async () => {
          await expect(
            updateQuestionById(
              mcQuestion._id.toString(),
              {
                options: [
                  { text: 'Option A', points: 10 },
                  { text: 'Option B' }, // Missing 'points'
                ],
              } as Partial<MultipleChoiceQuestion>,
              account._id.toString()
            )
          ).rejects.toThrow(
            'Each option must have a points value when scoring is enabled'
          );
        });

        it('should throw BadRequestError when updating MRQ without points in options', async () => {
          // Create a MRQ question
          const mrq = await MultipleResponseQuestionModel.create({
            text: 'Select applicable options',
            type: 'Multiple Response',
            order: 16,
            isRequired: true,
            isLocked: false,
            isScored: true,
            allowNegative: true,
            areWrongAnswersPenalized: true,
            allowPartialMarks: true,
            options: [
              { text: 'Option 1', points: 3 },
              { text: 'Option 2', points: 5 },
            ],
          });
          assessment.questions.push(mrq._id);
          assessment.questionsTotalMarks += 8; // Sum of positive points
          await assessment.save();

          await expect(
            updateQuestionById(
              mrq._id.toString(),
              {
                options: [
                  { text: 'Option 1', points: 3 },
                  { text: 'Option 3' }, // Missing 'points'
                ],
              } as Partial<MultipleResponseQuestion>,
              account._id.toString()
            )
          ).rejects.toThrow(
            'Each option must have a points value when scoring is enabled'
          );
        });

        it('should throw BadRequestError when updating MRQ without allowNegative', async () => {
          // Create a MRQ question
          const mrq = await MultipleResponseQuestionModel.create({
            text: 'Select applicable options',
            type: 'Multiple Response',
            order: 17,
            isRequired: true,
            isLocked: false,
            isScored: true,
            allowNegative: true,
            areWrongAnswersPenalized: true,
            allowPartialMarks: true,
            options: [
              { text: 'Option 1', points: 3 },
              { text: 'Option 2', points: 5 },
            ],
          });
          assessment.questions.push(mrq._id);
          assessment.questionsTotalMarks += 8; // Sum of positive points
          await assessment.save();

          await expect(
            updateQuestionById(
              mrq._id.toString(),
              {
                allowNegative: undefined, // Removing allowNegative
              },
              account._id.toString()
            )
          ).rejects.toThrow(
            'allowNegative must be specified when scoring is enabled for Multiple Response questions'
          );
        });

        it('should throw BadRequestError when updating Scale question without scaleMax', async () => {
          // Create a Scale question
          const scaleQ = await ScaleQuestionModel.create({
            text: 'Rate the session',
            type: 'Scale',
            order: 18,
            isRequired: true,
            isLocked: false,
            isScored: true,
            scaleMax: 10,
            labels: [
              { value: 1, label: 'Very Poor', points: 0 },
              { value: 10, label: 'Excellent', points: 10 },
            ],
          });
          assessment.questions.push(scaleQ._id);
          assessment.questionsTotalMarks += 10; // Last label points
          await assessment.save();

          await expect(
            updateQuestionById(
              scaleQ._id.toString(),
              {
                scaleMax: undefined, // Removing scaleMax
              },
              account._id.toString()
            )
          ).rejects.toThrow('scaleMax is required for Scale questions');
        });

        it('should throw BadRequestError when updating Scale question with less than two labels', async () => {
          // Create a Scale question
          const scaleQ = await ScaleQuestionModel.create({
            text: 'Rate the session',
            type: 'Scale',
            order: 19,
            isRequired: true,
            isLocked: false,
            isScored: true,
            scaleMax: 5,
            labels: [
              { value: 1, label: 'Poor', points: 0 },
              { value: 5, label: 'Good', points: 10 },
            ],
          });
          assessment.questions.push(scaleQ._id);
          assessment.questionsTotalMarks += 10; // Last label points
          await assessment.save();

          await expect(
            updateQuestionById(
              scaleQ._id.toString(),
              {
                labels: [{ value: 3, label: 'Average', points: 5 }], // Only one label
              },
              account._id.toString()
            )
          ).rejects.toThrow(
            'At least two labels are required for Scale questions'
          );
        });

        it('should throw BadRequestError when updating Scale question with label missing points', async () => {
          // Create a Scale question
          const scaleQ = await ScaleQuestionModel.create({
            text: 'Rate the session',
            type: 'Scale',
            order: 20,
            isRequired: true,
            isLocked: false,
            isScored: true,
            scaleMax: 5,
            labels: [
              { value: 1, label: 'Poor', points: 0 },
              { value: 5, label: 'Good', points: 10 },
            ],
          });
          assessment.questions.push(scaleQ._id);
          assessment.questionsTotalMarks += 10; // Last label points
          await assessment.save();

          await expect(
            updateQuestionById(
              scaleQ._id.toString(),
              {
                labels: [
                  { value: 1, label: 'Poor', points: 0 },
                  { value: 5, label: 'Good' }, // Missing 'points'
                ],
              } as Partial<ScaleQuestion>,
              account._id.toString()
            )
          ).rejects.toThrow(
            'Each label must have a points value when scoring is enabled'
          );
        });

        it('should throw BadRequestError when updating Number question without maxNumber', async () => {
          // Create a Number question
          const numberQ = await NumberQuestionModel.create({
            text: 'Enter your score',
            type: 'Number',
            order: 21,
            isRequired: true,
            isLocked: false,
            isScored: true,
            maxNumber: 100,
            scoringMethod: 'direct',
            maxPoints: 10,
          });
          assessment.questions.push(numberQ._id);
          assessment.questionsTotalMarks += 10; // maxPoints
          await assessment.save();

          await expect(
            updateQuestionById(
              numberQ._id.toString(),
              {
                maxNumber: undefined, // Removing maxNumber
              },
              account._id.toString()
            )
          ).rejects.toThrow('maxNumber is required for Number questions');
        });

        it('should throw BadRequestError when updating Number question with isScored but missing scoringMethod', async () => {
          // Create a Number question
          const numberQ = await NumberQuestionModel.create({
            text: 'Enter your score',
            type: 'Number',
            order: 22,
            isRequired: true,
            isLocked: false,
            isScored: true,
            maxNumber: 100,
            scoringMethod: 'direct',
            maxPoints: 10,
          });
          assessment.questions.push(numberQ._id);
          assessment.questionsTotalMarks += 10; // maxPoints
          await assessment.save();

          await expect(
            updateQuestionById(
              numberQ._id.toString(),
              {
                scoringMethod: undefined, // Removing scoringMethod
              },
              account._id.toString()
            )
          ).rejects.toThrow(
            'scoringMethod is required when scoring is enabled for Number questions'
          );
        });

        it('should throw BadRequestError when updating Number question with scoringMethod=range but missing scoringRanges', async () => {
          // Create a Number question with range scoring
          const numberQ = await NumberQuestionModel.create({
            text: 'Enter your score',
            type: 'Number',
            order: 23,
            isRequired: true,
            isLocked: false,
            isScored: true,
            maxNumber: 100,
            scoringMethod: 'range',
            scoringRanges: [
              { minValue: 0, maxValue: 50, points: 5 },
              { minValue: 51, maxValue: 100, points: 10 },
            ],
          });
          assessment.questions.push(numberQ._id);
          assessment.questionsTotalMarks += 10; // Last range points
          await assessment.save();

          await expect(
            updateQuestionById(
              numberQ._id.toString(),
              {
                scoringRanges: undefined, // Removing scoringRanges
              },
              account._id.toString()
            )
          ).rejects.toThrow(
            'scoringRanges are required for range scoring method'
          );
        });
      });

      describe('Assessment Score Updates', () => {
        it('should correctly update questionsTotalMarks when MCQ max points increase', async () => {
          const qid = mcQuestion._id.toString();
          mcQuestion.options.reduce(
            (acc: number, option: any) =>
              option.points > acc ? option.points : acc,
            0
          ); // 10

          const updated = await updateQuestionById(
            qid,
            {
              options: [
                { text: '今日もかわいい', points: 12 }, // Increased points from 10 to 12
                { text: '今日も怖い', points: 5 },
              ],
            },
            account._id.toString()
          );

          (updated as MultipleChoiceQuestion).options.reduce(
            (acc: number, option: any) =>
              option.points > acc ? option.points : acc,
            0
          ); // 12

          // Verify assessment's questionsTotalMarks updated correctly
          const updatedAssessment = await InternalAssessmentModel.findById(
            assessment._id
          );
          expect(updatedAssessment?.questionsTotalMarks).toBe(12); // Original was 10, now 12
        });

        it('should correctly update questionsTotalMarks when MRQ max points decrease', async () => {
          // Create a MRQ question
          const mrq = await MultipleResponseQuestionModel.create({
            text: 'Select applicable options',
            type: 'Multiple Response',
            order: 25,
            isRequired: true,
            isLocked: false,
            isScored: true,
            allowNegative: true,
            areWrongAnswersPenalized: true,
            allowPartialMarks: true,
            options: [
              { text: 'Option 1', points: 5 },
              { text: 'Option 2', points: 3 },
            ],
          });
          assessment.questions.push(mrq._id);
          assessment.questionsTotalMarks += 8; // Sum of positive points
          await assessment.save();

          mrq.options.reduce(
            (acc: number, option: any) =>
              option.points > 0 ? acc + option.points : acc,
            0
          ); // 8

          const updated = await updateQuestionById(
            mrq._id.toString(),
            {
              options: [
                { text: 'Option 1', points: 5 },
                { text: 'Option 3', points: 2 }, // Removed Option 2 (points:3), added Option3 (points:2)
              ],
            },
            account._id.toString()
          );

          (updated as MultipleResponseQuestion).options.reduce(
            (acc: number, option: any) =>
              option.points > 0 ? acc + option.points : acc,
            0
          ); // 7

          // Verify assessment's questionsTotalMarks updated correctly
          const updatedAssessment = await InternalAssessmentModel.findById(
            assessment._id
          );
          expect(updatedAssessment?.questionsTotalMarks).toBe(10 + 7); // Original mcQuestion:10 + updated MRQ:7
        });

        it('should correctly update questionsTotalMarks when Scale question points change', async () => {
          // Create a Scale question
          const scaleQ = await ScaleQuestionModel.create({
            text: 'Rate the course',
            type: 'Scale',
            order: 26,
            isRequired: true,
            isLocked: false,
            isScored: true,
            scaleMax: 5,
            labels: [
              { value: 1, label: 'Poor', points: 0 },
              { value: 5, label: 'Excellent', points: 10 },
            ],
          });
          assessment.questions.push(scaleQ._id);
          assessment.questionsTotalMarks += 10; // Last label points
          await assessment.save();

          const updated = await updateQuestionById(
            scaleQ._id.toString(),
            {
              labels: [
                { value: 1, label: 'Very Poor', points: 0 },
                { value: 3, label: 'Average', points: 5 },
                { value: 5, label: 'Excellent', points: 15 }, // Increased last label points
              ],
            },
            account._id.toString()
          );

          (updated as ScaleQuestion).labels.slice(-1)[0].points; // 15

          // Verify assessment's questionsTotalMarks updated correctly
          const updatedAssessment = await InternalAssessmentModel.findById(
            assessment._id
          );
          expect(updatedAssessment?.questionsTotalMarks).toBe(10 + 15); // Original mcQuestion:10 + updated Scale:15 =25
        });

        it('should correctly update questionsTotalMarks when Number question scoringMethod changes from direct to range', async () => {
          // Create a Number question with direct scoring
          const numberQ = await NumberQuestionModel.create({
            text: 'Enter your score',
            type: 'Number',
            order: 27,
            isRequired: true,
            isLocked: false,
            isScored: true,
            maxNumber: 100,
            scoringMethod: 'direct',
            maxPoints: 10,
          });
          assessment.questions.push(numberQ._id);
          assessment.questionsTotalMarks += 10; // maxPoints
          await assessment.save();

          await updateQuestionById(
            numberQ._id.toString(),
            {
              scoringMethod: 'range',
              scoringRanges: [
                { minValue: 0, maxValue: 50, points: 5 },
                { minValue: 51, maxValue: 100, points: 10 },
              ],
            },
            account._id.toString()
          );

          // Updated scoringMethod is 'range', last range points =10
          const updatedAssessment = await InternalAssessmentModel.findById(
            assessment._id
          );
          expect(updatedAssessment?.questionsTotalMarks).toBe(20); // maxPoints removed, replaced with 10 (same as before)
        });
      });
    });

    describe('Answer Remapping and Removal', () => {
      it('should remove old MCQ answers if options are changed and the old answer no longer exists', async () => {
        // Assume there are existing answers referencing old options
        // For example, an answer selecting '今日も怖い'
        const mcAnswer = await MultipleChoiceAnswerModel.create({
          question: mcQuestion._id,
          type: 'Multiple Choice Answer',
          value: '今日も怖い',
        });

        // Verify the answer exists before update
        const existingAnswer = await MultipleChoiceAnswerModel.findById(
          mcAnswer._id
        );
        expect(existingAnswer).not.toBeNull();

        // Update the MCQ options, removing '今日も怖い'
        await updateQuestionById(
          mcQuestion._id.toString(),
          {
            options: [
              { text: '今日もかわいい', points: 10 }, // Only one option now
            ],
          },
          account._id.toString()
        );

        // The old answer referencing '今日も怖い' should be removed
        const removedAnswer = await MultipleChoiceAnswerModel.findById(
          mcAnswer._id
        );
        expect(removedAnswer).toBeNull();
      });

      it('should unselect removed options in MRQ answers when options are updated', async () => {
        // Create a MRQ question
        const mrq = await MultipleResponseQuestionModel.create({
          text: 'Select applicable options',
          type: 'Multiple Response',
          order: 28,
          isRequired: true,
          isLocked: false,
          isScored: true,
          allowNegative: true,
          areWrongAnswersPenalized: true,
          allowPartialMarks: true,
          options: [
            { text: 'Option A', points: 3 },
            { text: 'Option B', points: 5 },
            { text: 'Option C', points: 2 },
          ],
        });
        assessment.questions.push(mrq._id);
        assessment.questionsTotalMarks += 10; // Sum of positive points:3+5+2=10
        await assessment.save();

        // Create an answer selecting Option A and Option B
        const mrqAnswer = await MultipleResponseAnswerModel.create({
          question: mrq._id,
          type: 'Multiple Response Answer',
          values: ['Option A', 'Option B'],
        });

        // Update MRQ options, removing 'Option B' and adding 'Option D'
        await updateQuestionById(
          mrq._id.toString(),
          {
            options: [
              { text: 'Option A', points: 3 },
              { text: 'Option D', points: 4 }, // Option B removed, Option D added
            ],
          },
          account._id.toString()
        );

        // The answer should now only contain 'Option A'
        const updatedAnswer = await MultipleResponseAnswerModel.findById(
          mrqAnswer._id
        );
        expect(updatedAnswer?.values).toEqual(['Option A']);
      });

      it('should delete MRQ answer if all selected options are removed', async () => {
        // Create a MRQ question
        const mrq = await MultipleResponseQuestionModel.create({
          text: 'Select applicable options',
          type: 'Multiple Response',
          order: 29,
          isRequired: true,
          isLocked: false,
          isScored: true,
          allowNegative: true,
          areWrongAnswersPenalized: true,
          allowPartialMarks: true,
          options: [
            { text: 'Option X', points: 3 },
            { text: 'Option Y', points: 5 },
          ],
        });
        assessment.questions.push(mrq._id);
        assessment.questionsTotalMarks += 8; // 3 +5
        await assessment.save();

        // Create an answer selecting both options
        const mrqAnswer = await MultipleResponseAnswerModel.create({
          question: mrq._id,
          type: 'Multiple Response Answer',
          values: ['Option X', 'Option Y'],
        });

        // Update MRQ options, removing both options
        await updateQuestionById(
          mrq._id.toString(),
          {
            options: [{ text: 'Option Z', points: 4 }],
          },
          account._id.toString()
        );

        // The answer should be deleted since no options remain
        const deletedAnswer = await MultipleResponseAnswerModel.findById(
          mrqAnswer._id
        );
        expect(deletedAnswer).toBeNull();

        // Verify assessment's questionsTotalMarks updated correctly
        const updatedAssessment = await InternalAssessmentModel.findById(
          assessment._id
        );
        expect(updatedAssessment?.questionsTotalMarks).toBe(10 + 8 - 8 + 4); // Original:18 +4 -8=14
      });
    });

    describe('Unauthorized Access', () => {
      it('should throw BadRequestError when a non-admin/faculty attempts to update a question', async () => {
        const studAcc = await AccountModel.create({
          email: 'unauthorized@example.com',
          password: 'pass',
          crispRole: CrispRole.Normal,
          courseRoles: {
            course: course._id.toString(),
            courseRole: CourseRole.Student,
          },
        });
        await expect(
          updateQuestionById(
            mcQuestion._id.toString(),
            { text: 'Attempted unauthorized update' },
            studAcc._id.toString()
          )
        ).rejects.toThrow('Unauthorized');
      });
    });

    describe('Edge Cases', () => {
      it('should handle updating a question with no changes gracefully', async () => {
        const qid = mcQuestion._id.toString();
        const updated = await updateQuestionById(
          qid,
          {},
          account._id.toString()
        );
        expect(updated._id.toString()).toBe(qid);
      });

      it('should prevent updating a question when assessment is not linked correctly', async () => {
        // Create a separate assessment and link the question to it
        const newAssessment = await InternalAssessmentModel.create({
          course: course._id,
          assessmentName: 'Separate Assessment',
          description: 'Another assessment',
          startDate: new Date(),
          maxMarks: 20,
          scaleToMaxMarks: true,
          granularity: 'team',
          teamSet: teamSet._id,
          areSubmissionsEditable: true,
          results: [],
          isReleased: false,
          questions: [],
          questionsTotalMarks: 0,
        });
        await newAssessment.save();

        // Link the existing mcQuestion to the new assessment
        await newAssessment.updateOne({ $push: { questions: mcQuestion._id } });
        newAssessment.questionsTotalMarks = newAssessment.questionsTotalMarks
          ? newAssessment.questionsTotalMarks + 10
          : 10;
        await newAssessment.save();

        // Attempt to update mcQuestion, which is now linked to newAssessment
        // The original assessment should not have this question
        await expect(
          updateQuestionById(
            mcQuestion._id.toString(),
            { text: 'Updated MCQ Text in New Assessment' },
            account._id.toString()
          )
        ).resolves.not.toThrow();

        // Verify that the original assessment's questionsTotalMarks remain unchanged
        const originalAssessment = await InternalAssessmentModel.findById(
          assessment._id
        );
        expect(originalAssessment?.questionsTotalMarks).toBe(10); // Assuming initial total was 10

        // Verify that the new assessment's questionsTotalMarks updated correctly
        const updatedNewAssessment = await InternalAssessmentModel.findById(
          newAssessment._id
        );
        expect(updatedNewAssessment?.questionsTotalMarks).toBe(10); // Added mcQuestion's max points
      });
    });
  });

  describe('deleteQuestionById', () => {
    it('should delete a question from assessment', async () => {
      const qid = mcQuestion._id.toString();
      await deleteQuestionById(
        assessment._id.toString(),
        qid,
        account._id.toString()
      );
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
        crispRole: CrispRole.Normal,
        courseRoles: {
          course: course._id.toString(),
          courseRole: CourseRole.Student,
        },
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
        deleteQuestionById(
          badAid,
          mcQuestion._id.toString(),
          account._id.toString()
        )
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
        crispRole: CrispRole.Normal,
        courseRoles: {
          course: course._id.toString(),
          courseRole: CourseRole.Student,
        },
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

  describe('recallInternalAssessmentById', () => {
    it('should recall a released assessment', async () => {
      // Release first
      await releaseInternalAssessmentById(
        assessment._id.toString(),
        account._id.toString()
      );
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
        crispRole: CrispRole.Normal,
        courseRoles: {
          course: course._id.toString(),
          courseRole: CourseRole.Student,
        },
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
        recaluculateSubmissionsForAssessment(assessment._id.toString(), noneAcc)
      ).rejects.toThrow();
    });

    it('should throw BadRequestError if user not faculty/admin', async () => {
      const studAcc = await AccountModel.create({
        email: 'stud99@example.com',
        password: 'pass',
        crispRole: CrispRole.Normal,
        courseRoles: {
          course: course._id.toString(),
          courseRole: CourseRole.Student,
        },
      });
      await expect(
        recaluculateSubmissionsForAssessment(
          assessment._id.toString(),
          studAcc._id.toString()
        )
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('reorderQuestions', () => {
    it('should reorder the existing questions', async () => {
      const assess = await InternalAssessmentModel.findById(
        assessment._id
      ).populate('questions');
      expect(assess?.questions.length).toBe(2);
      const reversed = assess!.questions
        .map((q: any) => q._id.toString())
        .reverse();

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
        crispRole: CrispRole.Normal,
        courseRoles: {
          course: course._id.toString(),
          courseRole: CourseRole.Student,
        },
      });
      const docs = await InternalAssessmentModel.findById(
        assessment._id
      ).populate('questions');
      const qids = docs!.questions.map((q: any) => q._id.toString());

      await expect(
        reorderQuestions(
          assessment._id.toString(),
          qids,
          studAcc._id.toString()
        )
      ).rejects.toThrow('Unauthorized');
    });

    it('should throw NotFoundError if assessment missing', async () => {
      const badAid = new mongoose.Types.ObjectId().toString();
      await expect(
        reorderQuestions(badAid, [], account._id.toString())
      ).rejects.toThrow('Assessment not found');
    });

    it('should throw BadRequestError if question array length mismatch', async () => {
      // We actually have 2 questions. If we pass array of length 1 => mismatch
      await expect(
        reorderQuestions(
          assessment._id.toString(),
          ['something'],
          account._id.toString()
        )
      ).rejects.toThrow('Question array length mismatch');
    });

    it('should throw BadRequestError if some questions are missing from input', async () => {
      const assessDocs = await InternalAssessmentModel.findById(
        assessment._id
      ).populate('questions');
      const realIds = assessDocs!.questions.map((q: any) => q._id.toString());
      // Remove one ID => mismatch
      realIds.pop();
      await expect(
        reorderQuestions(
          assessment._id.toString(),
          realIds,
          account._id.toString()
        )
      ).rejects.toThrow();
    });

    it('should throw if question not found in assessment (bogus ID in input)', async () => {
      const assessDocs = await InternalAssessmentModel.findById(
        assessment._id
      ).populate('questions');
      const realIds = assessDocs!.questions.map((q: any) => q._id.toString());

      // Replace last real ID with bogus
      realIds[1] = new mongoose.Types.ObjectId().toString();
      await expect(
        reorderQuestions(
          assessment._id.toString(),
          realIds,
          account._id.toString()
        )
      ).rejects.toThrow();
    });

    it('should throw BadRequestError if a question ID is not associated with the assessment', async () => {
      const unrelatedQuestion = await MultipleChoiceQuestionModel.create({
        text: 'Unrelated Question?',
        type: 'Multiple Choice',
        isRequired: true,
        isLocked: false,
        isScored: true,
        options: [
          { text: 'Yes', points: 10 },
          { text: 'No', points: 5 },
        ],
        order: 3,
      });
      await unrelatedQuestion.save();

      // Fetch the current assessment's question IDs
      const assess = await InternalAssessmentModel.findById(
        assessment._id
      ).populate('questions');
      const validQuestionIds = assess!.questions.map((q: any) =>
        q._id.toString()
      );

      // Append the unrelated question ID to the reorder array
      const reorderedIds = [
        ...validQuestionIds,
        unrelatedQuestion._id.toString(),
      ];

      // Attempt to reorder with an invalid question ID
      await expect(
        reorderQuestions(
          assessment._id.toString(),
          reorderedIds,
          account._id.toString()
        )
      ).rejects.toThrow();
    });
  });
});
