import AccountModel from '@models/Account';
import {
  MultipleChoiceAnswerModel,
  TeamMemberSelectionAnswerModel,
} from '@models/Answer';
import AssessmentAssignmentSetModel, {
  AssignedTeam,
} from '@models/AssessmentAssignmentSet';
import CourseModel from '@models/Course';
import InternalAssessmentModel from '@models/InternalAssessment';
import {
  MultipleChoiceQuestionModel,
  TeamMemberSelectionQuestionModel,
} from '@models/QuestionTypes';
import TeamModel from '@models/Team';
import TeamDataModel from '@models/TeamData';
import TeamSetModel from '@models/TeamSet';
import UserModel, { User } from '@models/User';
import Role from '@shared/types/auth/Role';
import { MultipleChoiceOption } from '@shared/types/Question';

export const setupTutorialDataJob = async () => {
  let trialUser = await UserModel.findOne({ identifier: 'trial' });
  let trialAccount = trialUser
    ? await AccountModel.findOne({
        email: 'trial@example.com',
        user: trialUser._id,
      })
    : null;
  if (!trialUser) {
    const trialUserDoc = new UserModel({
      identifier: 'trial',
      name: 'Trial User',
      enrolledCourses: [],
      gitHandle: '',
    });
    trialUser = await trialUserDoc.save();
  }
  if (!trialAccount) {
    const trialAccountDoc = new AccountModel({
      email: 'trial@example.com',
      password: '$2b$10$UslurkMG9ujw5vqMWqvxheF4zLmWE78XZ9QAeEW637GiyLvXk3EG6',
      role: 'Trial User',
      isApproved: true,
      wantsEmailNotifications: false,
      wantsTelegramNotifications: false,
      user: trialUser._id,
    });
    trialAccount = await trialAccountDoc.save();
  }
  const adminAccount = await AccountModel.findOne({
    role: Role.Admin,
  }).populate('user');
  if (!adminAccount || !adminAccount.user) {
    throw new Error(
      'Admin user does not exist, but is required by this script.'
    );
  }
  const adminUser = adminAccount.user;
  const existingTrialCourse = await CourseModel.findOne({ code: 'TRIAL' });
  if (existingTrialCourse) {
    const trialCourseId = existingTrialCourse._id;
    const teamSets = await TeamSetModel.find({ course: trialCourseId });
    const teamSetIds = teamSets.map(ts => ts._id);
    await TeamModel.deleteMany({ teamSet: { $in: teamSetIds } });
    await TeamSetModel.deleteMany({ _id: { $in: teamSetIds } });
    await TeamDataModel.deleteMany({ course: trialCourseId });
    const existingAssessments = await InternalAssessmentModel.find({
      course: trialCourseId,
    });
    for (const asmt of existingAssessments) {
      for (const questionId of asmt.questions) {
        await MultipleChoiceQuestionModel.deleteOne({ _id: questionId });
        await TeamMemberSelectionQuestionModel.deleteOne({ _id: questionId });
        await MultipleChoiceAnswerModel.deleteMany({ question: questionId });
        await TeamMemberSelectionAnswerModel.deleteMany({
          question: questionId,
        });
      }
      if (asmt.assessmentAssignmentSet) {
        await AssessmentAssignmentSetModel.deleteOne({
          _id: asmt.assessmentAssignmentSet,
        });
      }
    }
    await InternalAssessmentModel.deleteMany({ course: trialCourseId });
    const existingCourseRefreshed =
      await CourseModel.findById(trialCourseId).lean();
    if (existingCourseRefreshed?.students) {
      const keepUserIds = new Set([
        trialUser._id.toString(),
        adminUser._id.toString(),
      ]);
      const bogusStudentIds = existingCourseRefreshed.students.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (stuId: any) => !keepUserIds.has(stuId.toString())
      );
      if (bogusStudentIds.length > 0) {
        await AccountModel.deleteMany({ user: { $in: bogusStudentIds } });
        await UserModel.deleteMany({ _id: { $in: bogusStudentIds } });
      }
    }
    await CourseModel.deleteOne({ _id: trialCourseId });
  }
  const trialCourse = await CourseModel.create({
    name: 'Trial',
    code: 'TRIAL',
    semester: 'AY2323 S2',
    startDate: new Date(),
    durationWeeks: 13,
    courseType: 'Normal',
    sprints: [],
    milestones: [],
  });
  trialCourse.gitHubOrgName = 'trialrepo';
  await trialCourse.save();
  trialCourse.faculty.push(trialUser._id);
  trialCourse.faculty.push(adminUser._id);
  await trialCourse.save();
  if (!trialUser.enrolledCourses.includes(trialCourse._id)) {
    trialUser.enrolledCourses.push(trialCourse._id);
    await trialUser.save();
  }
  const studentIdArray: string[] = [];
  const studentArray: User[] = [];
  const createAndEnrollStudent = async ({
    identifier,
    name,
  }: {
    identifier: string;
    name: string;
  }) => {
    let studentUser = await UserModel.findOne({ identifier });
    if (!studentUser) {
      studentUser = await UserModel.create({
        identifier,
        name,
        enrolledCourses: [trialCourse._id],
        gitHandle: '',
      });
      await AccountModel.create({
        email: `${identifier}@example.com`,
        password:
          '$2b$10$UslurkMG9ujw5vqMWqvxheF4zLmWE78XZ9QAeEW637GiyLvXk3EG6',
        role: Role.Student,
        isApproved: true,
        wantsEmailNotifications: false,
        wantsTelegramNotifications: false,
        user: studentUser._id,
      });
    } else {
      if (!studentUser.enrolledCourses.includes(trialCourse._id)) {
        studentUser.enrolledCourses.push(trialCourse._id);
        await studentUser.save();
      }
    }
    if (!trialCourse.students.includes(studentUser._id)) {
      trialCourse.students.push(studentUser._id);
      await trialCourse.save();
    }
    studentIdArray.push(studentUser._id.toString());
    studentArray.push(studentUser);
  };
  await createAndEnrollStudent({ identifier: 'john-doe', name: 'John Doe' });
  await createAndEnrollStudent({
    identifier: 'johnny-smith',
    name: 'Johnny Smith',
  });
  await createAndEnrollStudent({
    identifier: 'hoshimachi-suisei',
    name: 'Hoshimachi Suisei',
  });
  const teamSet = await TeamSetModel.create({
    course: trialCourse._id,
    name: 'Project Groups',
    teams: [],
  });
  trialCourse.teamSets.push(teamSet._id);
  await trialCourse.save();
  const team = await TeamModel.create({
    teamSet: teamSet._id,
    number: 100,
    members: studentIdArray,
    TA: trialUser._id,
  });
  teamSet.teams.push(team._id);
  await teamSet.save();
  const teamData = await TeamDataModel.create({
    teamId: team.number,
    course: trialCourse._id,
    gitHubOrgName: 'org',
    repoName: 'team',
    commits: 42,
    issues: 5,
    pullRequests: 3,
    weeklyCommits: [
      [1, 4, 2],
      [0, 2, 5],
      [3, 1, 3],
    ],
    updatedIssues: [
      '#12 Fix login bug',
      '#15 Update README',
      '#20 UI improvements',
    ],
    teamContributions: {
      'John Doe': {
        commits: 10,
        createdIssues: 2,
        openIssues: 1,
        closedIssues: 1,
        pullRequests: 2,
        codeReviews: 3,
        comments: 5,
      },
      'Johnny Smith': {
        commits: 15,
        createdIssues: 1,
        openIssues: 2,
        closedIssues: 0,
        pullRequests: 1,
        codeReviews: 5,
        comments: 2,
      },
      'Hoshimachi Suisei': {
        commits: 17,
        createdIssues: 0,
        openIssues: 1,
        closedIssues: 1,
        pullRequests: 0,
        codeReviews: 1,
        comments: 8,
      },
    },
    teamPRs: [
      {
        id: 2171165196,
        title: 'feat: update test plan to use 600 threads',
        user: 'Aloynz',
        url: 'https://github.com/cs4218/cs4218-project-2024-team01/pull/29',
        state: 'closed',
        createdAt: new Date('2024-11-09T20:13:24Z'),
        updatedAt: new Date('2024-11-09T20:13:33Z'),
        reviews: [
          {
            id: 9991,
            user: 'WeeMingQing',
            body: 'Looks good to me!',
            state: 'APPROVED',
            submittedAt: new Date('2024-11-09T21:10:00Z'),
            comments: [
              {
                id: 501,
                user: 'WeeMingQing',
                body: 'One more detail: rename variable X to Y?',
                createdAt: new Date('2024-11-09T21:12:00Z'),
              },
            ],
          },
        ],
      },
      {
        id: 2170847039,
        title: 'feat: add volume testing for create-product',
        user: 'Aloynz',
        url: 'https://github.com/cs4218/cs4218-project-2024-team01/pull/28',
        state: 'closed',
        createdAt: new Date('2024-11-09T09:06:15Z'),
        updatedAt: new Date('2024-11-09T09:07:04Z'),
        reviews: [],
      },
      {
        id: 2170212614,
        title: 'Add endurance test for search product',
        user: 'WeeMingQing',
        url: 'https://github.com/cs4218/cs4218-project-2024-team01/pull/27',
        state: 'closed',
        createdAt: new Date('2024-11-08T18:04:56Z'),
        updatedAt: new Date('2024-11-08T18:05:21Z'),
        reviews: [
          {
            id: 10001,
            user: 'Aloynz',
            body: 'LGTM, thanks!',
            state: 'APPROVED',
            submittedAt: new Date('2024-11-08T19:00:00Z'),
            comments: [],
          },
        ],
      },
    ],
    milestones: [
      {
        title: 'M1: Project Setup',
        description: 'Repository set up, initial environment configured.',
        open_issues: 2,
        closed_issues: 3,
        state: 'closed',
        created_at: new Date('2024-11-01T00:00:00Z'),
        updated_at: new Date('2024-11-02T00:00:00Z'),
        due_on: new Date('2024-11-15T00:00:00Z'),
        closed_at: new Date('2024-11-10T00:00:00Z'),
      },
      {
        title: 'M2: Basic Features',
        description: 'Implement core functionalities and unit tests.',
        open_issues: 1,
        closed_issues: 4,
        state: 'open',
        created_at: new Date('2024-11-10T00:00:00Z'),
        updated_at: new Date('2024-11-11T00:00:00Z'),
        due_on: new Date('2024-12-01T00:00:00Z'),
      },
    ],
  });
  team.teamData = teamData._id;
  await team.save();
  const teamMemberQuestion = new TeamMemberSelectionQuestionModel({
    text: 'Select students',
    type: 'Team Member Selection',
    isRequired: true,
    isLocked: true,
    order: 1,
  });
  await teamMemberQuestion.save();
  const teamMemberAnswer = new TeamMemberSelectionAnswerModel({
    question: teamMemberQuestion._id,
    type: 'Team Member Selection Answer',
    selectedUserIds: studentIdArray,
  });
  await teamMemberAnswer.save();
  const mcQuestion = new MultipleChoiceQuestionModel({
    text: 'Is CRISP the best course management platform available?',
    type: 'Multiple Choice',
    isRequired: true,
    isLocked: false,
    isScored: true,
    options: [
      {
        text: 'Yes',
        points: 10,
      },
      {
        text: 'No',
        points: 0,
      },
    ] as MultipleChoiceOption[],
    order: 2,
  });
  await mcQuestion.save();
  const mcAnswer = new MultipleChoiceAnswerModel({
    question: mcQuestion._id,
    type: 'Multiple Choice Answer',
    value: 'Yes',
  });
  await mcAnswer.save();
  const startDate = new Date();
  startDate.setUTCFullYear(new Date().getUTCFullYear() - 1);
  const assessment = await InternalAssessmentModel.create({
    course: trialCourse._id,
    assessmentName: 'Midterm Exam',
    description: 'Midterm assessment',
    startDate: startDate,
    maxMarks: 10,
    scaleToMaxMarks: true,
    granularity: 'team',
    teamSet: teamSet._id,
    areSubmissionsEditable: true,
    results: [],
    isReleased: true,
    questions: [teamMemberQuestion._id, mcQuestion._id],
  });
  trialCourse.internalAssessments.push(assessment.id);
  trialCourse.save();
  const assignmentSet = await AssessmentAssignmentSetModel.create({
    assessment: assessment._id,
    assignedTeams: {
      team: team,
      tas: [trialUser],
    } as AssignedTeam,
  });
  await assignmentSet.save();
  assessment.assessmentAssignmentSet = assignmentSet._id;
  await assessment.save();
  console.log(
    'Trial data setup complete! All old trial data replaced with fresh data.'
  );
};

export default setupTutorialDataJob;
