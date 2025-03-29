import AccountModel from '@models/Account';
import codeAnalysisDataModel from '@models/CodeAnalysisData';
import CourseModel from '@models/Course';
import {
  JiraBoardModel,
  JiraIssueModel,
  JiraSprintModel,
} from '@models/JiraData';
import {
  MultipleChoiceAnswerModel,
  TeamMemberSelectionAnswerModel,
} from '@models/Answer';
import AssessmentAssignmentSetModel, {
  AssignedTeam,
} from '@models/AssessmentAssignmentSet';
import InternalAssessmentModel from '@models/InternalAssessment';
import {
  MultipleChoiceQuestionModel,
  TeamMemberSelectionQuestionModel,
} from '@models/QuestionTypes';
import TeamModel from '@models/Team';
import TeamDataModel from '@models/TeamData';
import TeamSetModel from '@models/TeamSet';
import UserModel, { User } from '@models/User';
import { JiraBoard } from '@shared/types/JiraData';
import { MultipleChoiceOption } from '@shared/types/Question';
import CrispRole from '@shared/types/auth/CrispRole';
import CourseRole from '@shared/types/auth/CourseRole';

const START_DATE_STRING = '2024-10-10T20:13:24Z';

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
      role: CrispRole.TrialUser,
      isApproved: true,
      wantsEmailNotifications: false,
      wantsTelegramNotifications: false,
      user: trialUser._id,
    });
    trialAccount = await trialAccountDoc.save();
  }

  const adminAccount = await AccountModel.findOne({
    crispRole: CrispRole.Admin,
  }).populate('user');
  if (!adminAccount || !adminAccount.user) {
    throw new Error(
      'Admin user does not exist, but is required by this script.'
    );
  }
  const adminUser = adminAccount.user;

  const existingTrialCourse = await CourseModel.findOne({ code: 'TRIAL' });
  if (existingTrialCourse) {
    adminAccount.courseRoles = adminAccount.courseRoles.filter(
      r => r.course !== existingTrialCourse._id.toString()
    );
    await adminAccount.save();
    const trialCourseId = existingTrialCourse._id;
    const teamSets = await TeamSetModel.find({ course: trialCourseId });
    const teamSetIds = teamSets.map(ts => ts._id);

    await TeamModel.deleteMany({ teamSet: { $in: teamSetIds } });
    await TeamSetModel.deleteMany({ _id: { $in: teamSetIds } });
    await TeamDataModel.deleteMany({ course: trialCourseId });

    const jiraBoards = await JiraBoardModel.find({ course: trialCourseId });
    for (const board of jiraBoards) {
      if (board.jiraIssues && board.jiraIssues.length > 0) {
        await JiraIssueModel.deleteMany({ _id: { $in: board.jiraIssues } });
      }
      if (board.jiraSprints && board.jiraSprints.length > 0) {
        await JiraSprintModel.deleteMany({ _id: { $in: board.jiraSprints } });
      }
    }
    await JiraBoardModel.deleteMany({ course: trialCourseId });
    await codeAnalysisDataModel.deleteMany({
      gitHubOrgName: existingTrialCourse.gitHubOrgName,
    });

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
    startDate: new Date(START_DATE_STRING),
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

  trialAccount.courseRoles.push({
    course: trialCourse._id.toString(),
    courseRole: CourseRole.Faculty,
  });
  await trialAccount.save();

  adminAccount.courseRoles.push({
    course: trialCourse._id.toString(),
    courseRole: CourseRole.Faculty,
  });
  await adminAccount.save();

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
        crispRole: CrispRole.Normal,
        isApproved: true,
        wantsEmailNotifications: false,
        wantsTelegramNotifications: false,
        user: studentUser._id,
        courseRoles: [],
      });
    } else {
      if (!studentUser.enrolledCourses.includes(trialCourse._id)) {
        studentUser.enrolledCourses.push(trialCourse._id);
        let studentAccount = await AccountModel.findOne({
          user: studentUser._id,
        });
        if (!studentAccount) {
          studentAccount = await AccountModel.create({
            email: `${identifier}@example.com`,
            password:
              '$2b$10$UslurkMG9ujw5vqMWqvxheF4zLmWE78XZ9QAeEW637GiyLvXk3EG6',
            crispRole: CrispRole.Normal,
            isApproved: true,
            wantsEmailNotifications: false,
            wantsTelegramNotifications: false,
            user: studentUser._id,
            courseRoles: [],
          });
        }
        studentAccount.courseRoles.push({
          course: trialCourse._id.toString(),
          courseRole: CourseRole.Student,
        });
        await studentUser.save();
        await studentAccount.save();
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
    //   {
    //     id: 2171165196,
    //     title: 'feat: update test plan to use 600 threads',
    //     user: 'John Doe',
    //     url: 'https://github.com/cs4218/cs4218-project-2024-team01/pull/29',
    //     state: 'closed',
    //     createdAt: new Date('2024-11-09T20:13:24Z'),
    //     updatedAt: new Date('2024-11-09T20:13:33Z'),
    //     reviews: [
    //       {
    //         id: 9991,
    //         user: 'Johnny Smith',
    //         body: 'Looks good, but can we handle bigger load?',
    //         state: 'COMMENTED',
    //         submittedAt: new Date('2024-11-09T21:10:00Z'),
    //         comments: [
    //           {
    //             id: 501,
    //             user: 'Johnny Smith',
    //             body: 'One more detail: rename variable X to Y?',
    //             createdAt: new Date('2024-11-09T21:12:00Z'),
    //           },
    //         ],
    //       },
    //       {
    //         id: 9992,
    //         user: 'Hoshimachi Suisei',
    //         body: 'Tested locally, it works well!',
    //         state: 'APPROVED',
    //         submittedAt: new Date('2024-11-09T21:30:00Z'),
    //         comments: [],
    //       },
    //       {
    //         id: 9993,
    //         user: 'Johnny Smith',
    //         body: 'Ok, I added more concurrency tests. Approving now.',
    //         state: 'APPROVED',
    //         submittedAt: new Date('2024-11-09T21:45:00Z'),
    //         comments: [
    //           {
    //             id: 502,
    //             user: 'Johnny Smith',
    //             body: 'Awesome! Merging this PR now.',
    //             createdAt: new Date('2024-11-09T21:50:00Z'),
    //           },
    //         ],
    //       },
    //     ],
    //   },
    //   {
    //     id: 2170847039,
    //     title: 'feat: add volume testing for create-product',
    //     user: 'John Doe',
    //     url: 'https://github.com/cs4218/cs4218-project-2024-team01/pull/28',
    //     state: 'closed',
    //     createdAt: new Date('2024-11-09T09:06:15Z'),
    //     updatedAt: new Date('2024-11-09T09:07:04Z'),
    //     reviews: [
    //       {
    //         id: 8881,
    //         user: 'Hoshimachi Suisei',
    //         body: 'Volume tests are fine. Let’s ensure logs are rotated properly.',
    //         state: 'COMMENTED',
    //         submittedAt: new Date('2024-11-09T09:10:00Z'),
    //         comments: [],
    //       },
    //     ],
    //   },
    //   {
    //     id: 2170212614,
    //     title: 'Add endurance test for search product',
    //     user: 'John Doe',
    //     url: 'https://github.com/cs4218/cs4218-project-2024-team01/pull/27',
    //     state: 'closed',
    //     createdAt: new Date('2024-11-08T18:04:56Z'),
    //     updatedAt: new Date('2024-11-08T18:05:21Z'),
    //     reviews: [
    //       {
    //         id: 10001,
    //         user: 'Johnny Smith',
    //         body: 'LGTM, thanks for adding the search tests!',
    //         state: 'APPROVED',
    //         submittedAt: new Date('2024-11-08T19:00:00Z'),
    //         comments: [],
    //       },
    //       {
    //         id: 10002,
    //         user: 'Hoshimachi Suisei',
    //         body: 'Maybe add logs for slow queries? Otherwise it looks good!',
    //         state: 'COMMENTED',
    //         submittedAt: new Date('2024-11-08T19:05:00Z'),
    //         comments: [],
    //       },
    //     ],
    //   },
    // ],
    // Enhanced PR dataset with 6 students and more interaction types
    teamPRs: [
      {
        id: 2171165196,
        title: 'feat: Implement user authentication module',
        user: 'Student 1',
        url: 'https://github.com/cs4218/cs4218-project-2024-team01/pull/30',
        state: 'closed',
        createdAt: new Date('2024-11-15T09:10:24Z'),
        updatedAt: new Date('2024-11-17T14:35:33Z'),
        reviews: [
          {
            id: 9001,
            user: 'Student 2',
            body: 'I found several security issues with the authentication flow. Please address them before merging.',
            state: 'CHANGES_REQUESTED',
            submittedAt: new Date('2024-11-15T11:23:00Z'),
            comments: [
              {
                id: 601,
                user: 'Student 2',
                body: 'The password hashing algorithm needs to be updated to use bcrypt with a higher work factor.',
                createdAt: new Date('2024-11-15T11:25:00Z'),
              },
              {
                id: 602,
                user: 'Student 2',
                body: 'Please add rate limiting to prevent brute force attacks.',
                createdAt: new Date('2024-11-15T11:27:00Z'),
              },
            ],
          },
          {
            id: 9002,
            user: 'Student 3',
            body: "The authentication module looks good overall, but I agree with Student 2's security concerns.",
            state: 'COMMENTED',
            submittedAt: new Date('2024-11-15T13:45:00Z'),
            comments: [
              {
                id: 603,
                user: 'Student 3',
                body: 'Also, consider adding JWT expiration times for better security.',
                createdAt: new Date('2024-11-15T13:47:00Z'),
              },
            ],
          },
          {
            id: 9003,
            user: 'Student 1',
            body: "I've addressed all the security concerns raised. Updated the hashing, added rate limiting, and implemented JWT expiration.",
            state: 'COMMENTED',
            submittedAt: new Date('2024-11-16T10:30:00Z'),
            comments: [],
          },
          {
            id: 9004,
            user: 'Student 2',
            body: 'Changes look good. Approving now.',
            state: 'APPROVED',
            submittedAt: new Date('2024-11-16T14:20:00Z'),
            comments: [],
          },
          {
            id: 9005,
            user: 'Student 4',
            body: 'Great implementation! This will significantly improve our security posture.',
            state: 'APPROVED',
            submittedAt: new Date('2024-11-16T16:15:00Z'),
            comments: [],
          },
        ],
      },
      {
        id: 2171165197,
        title: 'feat: Add data visualization dashboard',
        user: 'Student 5',
        url: 'https://github.com/cs4218/cs4218-project-2024-team01/pull/31',
        state: 'closed',
        createdAt: new Date('2024-11-18T08:30:15Z'),
        updatedAt: new Date('2024-11-20T17:45:33Z'),
        reviews: [
          {
            id: 9006,
            user: 'Student 6',
            body: 'The dashboard looks amazing! I have a few suggestions for usability improvements.',
            state: 'COMMENTED',
            submittedAt: new Date('2024-11-18T10:15:00Z'),
            comments: [
              {
                id: 604,
                user: 'Student 6',
                body: 'Consider adding tooltips to the chart elements for better user experience.',
                createdAt: new Date('2024-11-18T10:17:00Z'),
              },
              {
                id: 605,
                user: 'Student 6',
                body: 'The color scheme might be difficult for colorblind users. Could we use a more accessible palette?',
                createdAt: new Date('2024-11-18T10:20:00Z'),
              },
            ],
          },
          {
            id: 9007,
            user: 'Student 3',
            body: "I'm concerned about the performance with large datasets. Did you test with 10k+ records?",
            state: 'CHANGES_REQUESTED',
            submittedAt: new Date('2024-11-18T11:30:00Z'),
            comments: [
              {
                id: 606,
                user: 'Student 3',
                body: 'Suggest implementing data pagination or virtualized lists to handle larger data sets more efficiently.',
                createdAt: new Date('2024-11-18T11:32:00Z'),
              },
            ],
          },
          {
            id: 9008,
            user: 'Student 5',
            body: "I've added tooltips, updated the color scheme to be colorblind-friendly, and implemented virtualized lists for better performance with large datasets.",
            state: 'COMMENTED',
            submittedAt: new Date('2024-11-19T09:45:00Z'),
            comments: [],
          },
          {
            id: 9009,
            user: 'Student 3',
            body: "I've tested the performance improvements and they work well. Approving now.",
            state: 'APPROVED',
            submittedAt: new Date('2024-11-19T14:10:00Z'),
            comments: [],
          },
          {
            id: 9010,
            user: 'Student 1',
            body: 'Excellent work on the visualizations and the performance optimizations!',
            state: 'APPROVED',
            submittedAt: new Date('2024-11-19T16:20:00Z'),
            comments: [],
          },
        ],
      },
      {
        id: 2171165198,
        title: 'refactor: Optimize database queries for better performance',
        user: 'Student 4',
        url: 'https://github.com/cs4218/cs4218-project-2024-team01/pull/32',
        state: 'closed',
        createdAt: new Date('2024-11-22T11:15:24Z'),
        updatedAt: new Date('2024-11-24T18:20:33Z'),
        reviews: [
          {
            id: 9011,
            user: 'Student 2',
            body: 'Great optimization work. The query execution time improvements are significant.',
            state: 'APPROVED',
            submittedAt: new Date('2024-11-22T13:40:00Z'),
            comments: [
              {
                id: 607,
                user: 'Student 2',
                body: 'Did you consider adding indexes for the frequently queried fields?',
                createdAt: new Date('2024-11-22T13:42:00Z'),
              },
            ],
          },
          {
            id: 9012,
            user: 'Student 4',
            body: "Good point about indexes. I've added them for the most frequently queried fields.",
            state: 'COMMENTED',
            submittedAt: new Date('2024-11-22T15:30:00Z'),
            comments: [],
          },
          {
            id: 9013,
            user: 'Student 6',
            body: "I'm not convinced by the approach in the repository layer. Let's discuss this further.",
            state: 'CHANGES_REQUESTED',
            submittedAt: new Date('2024-11-22T16:45:00Z'),
            comments: [
              {
                id: 608,
                user: 'Student 6',
                body: 'The repository pattern implementation seems overly complex for our needs.',
                createdAt: new Date('2024-11-22T16:47:00Z'),
              },
              {
                id: 609,
                user: 'Student 6',
                body: 'I suggest simplifying it to improve maintainability without sacrificing performance.',
                createdAt: new Date('2024-11-22T16:50:00Z'),
              },
            ],
          },
          {
            id: 9014,
            user: 'Student 4',
            body: "After our offline discussion, I've simplified the repository implementation while maintaining the performance improvements.",
            state: 'COMMENTED',
            submittedAt: new Date('2024-11-23T10:15:00Z'),
            comments: [],
          },
          {
            id: 9015,
            user: 'Student 6',
            body: 'The simplified approach looks much better. Approving now.',
            state: 'APPROVED',
            submittedAt: new Date('2024-11-23T11:30:00Z'),
            comments: [],
          },
          {
            id: 9016,
            user: 'Student 1',
            body: 'The performance improvements are impressive. The query time is reduced by 70%!',
            state: 'APPROVED',
            submittedAt: new Date('2024-11-23T14:20:00Z'),
            comments: [],
          },
        ],
      },
      {
        id: 2171165199,
        title:
          'fix: Resolve concurrent modification issues in shared data structures',
        user: 'Student 3',
        url: 'https://github.com/cs4218/cs4218-project-2024-team01/pull/33',
        state: 'closed',
        createdAt: new Date('2024-11-25T13:45:24Z'),
        updatedAt: new Date('2024-11-27T09:30:33Z'),
        reviews: [
          {
            id: 9017,
            user: 'Student 5',
            body: "I'm concerned that the thread synchronization approach might lead to deadlocks.",
            state: 'CHANGES_REQUESTED',
            submittedAt: new Date('2024-11-25T15:10:00Z'),
            comments: [
              {
                id: 610,
                user: 'Student 5',
                body: 'Consider using the read-write lock pattern instead of full synchronization to reduce contention.',
                createdAt: new Date('2024-11-25T15:12:00Z'),
              },
            ],
          },
          {
            id: 9018,
            user: 'Student 3',
            body: "Good suggestion. I've updated the implementation to use read-write locks where appropriate.",
            state: 'COMMENTED',
            submittedAt: new Date('2024-11-25T17:30:00Z'),
            comments: [],
          },
          {
            id: 9019,
            user: 'Student 1',
            body: "I've reviewed the changes and I'm still seeing a potential race condition in the cache update logic.",
            state: 'CHANGES_REQUESTED',
            submittedAt: new Date('2024-11-26T09:15:00Z'),
            comments: [
              {
                id: 611,
                user: 'Student 1',
                body: 'Check line 157 - the cache invalidation and update needs to be atomic.',
                createdAt: new Date('2024-11-26T09:17:00Z'),
              },
            ],
          },
          {
            id: 9020,
            user: 'Student 3',
            body: 'Fixed the race condition by making the cache operations atomic. Good catch!',
            state: 'COMMENTED',
            submittedAt: new Date('2024-11-26T11:45:00Z'),
            comments: [],
          },
          {
            id: 9021,
            user: 'Student 5',
            body: 'The read-write lock implementation looks good, and the race condition is fixed. Approving now.',
            state: 'APPROVED',
            submittedAt: new Date('2024-11-26T14:20:00Z'),
            comments: [],
          },
          {
            id: 9022,
            user: 'Student 1',
            body: 'All concerns addressed. This should fix our concurrency issues. Approving.',
            state: 'APPROVED',
            submittedAt: new Date('2024-11-26T16:30:00Z'),
            comments: [],
          },
        ],
      },
      {
        id: 2171165200,
        title: 'feat: Add end-to-end testing framework with Cypress',
        user: 'Student 2',
        url: 'https://github.com/cs4218/cs4218-project-2024-team01/pull/34',
        state: 'open',
        createdAt: new Date('2024-11-28T10:30:24Z'),
        updatedAt: new Date('2024-11-29T16:45:33Z'),
        reviews: [
          {
            id: 9023,
            user: 'Student 4',
            body: 'This is a comprehensive test framework setup. I like the approach with custom commands.',
            state: 'COMMENTED',
            submittedAt: new Date('2024-11-28T13:15:00Z'),
            comments: [
              {
                id: 612,
                user: 'Student 4',
                body: 'Consider adding screenshots on test failures for better debugging.',
                createdAt: new Date('2024-11-28T13:17:00Z'),
              },
            ],
          },
          {
            id: 9024,
            user: 'Student 2',
            body: 'Added screenshot and video capture on test failures as suggested.',
            state: 'COMMENTED',
            submittedAt: new Date('2024-11-28T15:30:00Z'),
            comments: [],
          },
          {
            id: 9025,
            user: 'Student 6',
            body: "I'm dismissing my review because I realized I don't have enough context on Cypress to provide a meaningful review.",
            state: 'DISMISSED',
            submittedAt: new Date('2024-11-28T16:45:00Z'),
            comments: [
              {
                id: 613,
                user: 'Student 6',
                body: 'I initially had concerns about the test structure but after reading the docs, I see this is the recommended approach.',
                createdAt: new Date('2024-11-28T16:47:00Z'),
              },
            ],
          },
          {
            id: 9026,
            user: 'Student 5',
            body: 'The CI integration for the tests is missing. We need to update our GitHub Actions workflow.',
            state: 'CHANGES_REQUESTED',
            submittedAt: new Date('2024-11-29T09:10:00Z'),
            comments: [
              {
                id: 614,
                user: 'Student 5',
                body: 'Please add a GitHub Actions workflow file that runs the Cypress tests on PRs.',
                createdAt: new Date('2024-11-29T09:12:00Z'),
              },
            ],
          },
          {
            id: 9027,
            user: 'Student 2',
            body: 'Added GitHub Actions workflow for running Cypress tests on PRs and main branch.',
            state: 'COMMENTED',
            submittedAt: new Date('2024-11-29T11:30:00Z'),
            comments: [],
          },
          {
            id: 9028,
            user: 'Student 5',
            body: 'The GitHub Actions workflow looks good. Approving the PR.',
            state: 'APPROVED',
            submittedAt: new Date('2024-11-29T13:45:00Z'),
            comments: [],
          },
          {
            id: 9029,
            user: 'Student 4',
            body: 'Great work! This will significantly improve our testing process.',
            state: 'APPROVED',
            submittedAt: new Date('2024-11-29T15:20:00Z'),
            comments: [],
          },
        ],
      },
      {
        id: 2171165201,
        title: 'feat: Implement real-time collaboration with WebSockets',
        user: 'Student 6',
        url: 'https://github.com/cs4218/cs4218-project-2024-team01/pull/35',
        state: 'open',
        createdAt: new Date('2024-12-01T09:20:24Z'),
        updatedAt: new Date('2024-12-02T14:15:33Z'),
        reviews: [
          {
            id: 9030,
            user: 'Student 3',
            body: 'The WebSocket implementation is robust, but I have concerns about scaling.',
            state: 'CHANGES_REQUESTED',
            submittedAt: new Date('2024-12-01T11:30:00Z'),
            comments: [
              {
                id: 615,
                user: 'Student 3',
                body: 'For horizontal scaling, we need to add Redis for pub/sub across multiple instances.',
                createdAt: new Date('2024-12-01T11:32:00Z'),
              },
              {
                id: 616,
                user: 'Student 3',
                body: 'Also, the reconnection strategy could be improved with exponential backoff.',
                createdAt: new Date('2024-12-01T11:35:00Z'),
              },
            ],
          },
          {
            id: 9031,
            user: 'Student 1',
            body: "Great work on implementing the WebSockets! I second Student 3's concerns about scaling.",
            state: 'COMMENTED',
            submittedAt: new Date('2024-12-01T13:45:00Z'),
            comments: [
              {
                id: 617,
                user: 'Student 1',
                body: 'We should also consider adding message compression for bandwidth efficiency.',
                createdAt: new Date('2024-12-01T13:47:00Z'),
              },
            ],
          },
          {
            id: 9032,
            user: 'Student 6',
            body: "I've added Redis for pub/sub, implemented exponential backoff for reconnection, and added message compression.",
            state: 'COMMENTED',
            submittedAt: new Date('2024-12-02T09:15:00Z'),
            comments: [],
          },
          {
            id: 9033,
            user: 'Student 3',
            body: "The Redis integration looks good, but there's an issue with the error handling in the reconnection logic.",
            state: 'CHANGES_REQUESTED',
            submittedAt: new Date('2024-12-02T10:30:00Z'),
            comments: [
              {
                id: 618,
                user: 'Student 3',
                body: "The error callback in the reconnection attempt doesn't propagate the error correctly.",
                createdAt: new Date('2024-12-02T10:32:00Z'),
              },
            ],
          },
          {
            id: 9034,
            user: 'Student 6',
            body: 'Fixed the error handling in the reconnection logic.',
            state: 'COMMENTED',
            submittedAt: new Date('2024-12-02T11:45:00Z'),
            comments: [],
          },
          {
            id: 9035,
            user: 'Student 3',
            body: 'All issues are addressed now. This is a great addition to our platform!',
            state: 'APPROVED',
            submittedAt: new Date('2024-12-02T12:30:00Z'),
            comments: [],
          },
        ],
      },
      {
        id: 2171165202,
        title: 'fix: Security vulnerabilities in file upload system',
        user: 'Student 1',
        url: 'https://github.com/cs4218/cs4218-project-2024-team01/pull/36',
        state: 'closed',
        createdAt: new Date('2024-12-03T08:45:24Z'),
        updatedAt: new Date('2024-12-04T16:20:33Z'),
        reviews: [
          {
            id: 9036,
            user: 'Student 4',
            body: "Great security improvements! I've tested the fixes and they work well.",
            state: 'APPROVED',
            submittedAt: new Date('2024-12-03T10:15:00Z'),
            comments: [
              {
                id: 619,
                user: 'Student 4',
                body: 'I appreciate the thorough approach to fixing these vulnerabilities.',
                createdAt: new Date('2024-12-03T10:17:00Z'),
              },
            ],
          },
          {
            id: 9037,
            user: 'Student 2',
            body: 'This is a critical security fix. I found one more issue that needs to be addressed.',
            state: 'CHANGES_REQUESTED',
            submittedAt: new Date('2024-12-03T11:30:00Z'),
            comments: [
              {
                id: 620,
                user: 'Student 2',
                body: "There's still a path traversal vulnerability in the file name validation.",
                createdAt: new Date('2024-12-03T11:32:00Z'),
              },
            ],
          },
          {
            id: 9038,
            user: 'Student 1',
            body: "Good catch! I've fixed the path traversal vulnerability and added tests for it.",
            state: 'COMMENTED',
            submittedAt: new Date('2024-12-03T13:45:00Z'),
            comments: [],
          },
          {
            id: 9039,
            user: 'Student 2',
            body: 'The path traversal fix looks good. Approving now.',
            state: 'APPROVED',
            submittedAt: new Date('2024-12-03T15:10:00Z'),
            comments: [],
          },
          {
            id: 9040,
            user: 'Student 5',
            body: "I've reviewed the security fixes and they're solid. Let's merge this ASAP.",
            state: 'APPROVED',
            submittedAt: new Date('2024-12-03T16:30:00Z'),
            comments: [],
          },
        ],
      },
      {
        id: 2171165203,
        title: 'feat: Implement analytics dashboard with custom metrics',
        user: 'Student 5',
        url: 'https://github.com/cs4218/cs4218-project-2024-team01/pull/37',
        state: 'closed',
        createdAt: new Date('2024-12-05T09:30:24Z'),
        updatedAt: new Date('2024-12-07T15:45:33Z'),
        reviews: [
          {
            id: 9041,
            user: 'Student 3',
            body: 'The analytics dashboard looks amazing! However, I have performance concerns with the data aggregation.',
            state: 'CHANGES_REQUESTED',
            submittedAt: new Date('2024-12-05T11:15:00Z'),
            comments: [
              {
                id: 621,
                user: 'Student 3',
                body: 'The aggregation should be done in the database, not in the application layer.',
                createdAt: new Date('2024-12-05T11:17:00Z'),
              },
              {
                id: 622,
                user: 'Student 3',
                body: "Also, let's add caching for these expensive aggregation queries.",
                createdAt: new Date('2024-12-05T11:20:00Z'),
              },
            ],
          },
          {
            id: 9042,
            user: 'Student 6',
            body: 'I love the UI design of the dashboard! The filters and time period selection are intuitive.',
            state: 'COMMENTED',
            submittedAt: new Date('2024-12-05T13:30:00Z'),
            comments: [
              {
                id: 623,
                user: 'Student 6',
                body: 'Could we add the ability to export the analytics data to CSV?',
                createdAt: new Date('2024-12-05T13:32:00Z'),
              },
            ],
          },
          {
            id: 9043,
            user: 'Student 5',
            body: "I've moved the aggregation to the database layer, added caching, and implemented CSV export functionality.",
            state: 'COMMENTED',
            submittedAt: new Date('2024-12-06T10:45:00Z'),
            comments: [],
          },
          {
            id: 9044,
            user: 'Student 3',
            body: 'The performance improvements are significant. The dashboard loads much faster now.',
            state: 'APPROVED',
            submittedAt: new Date('2024-12-06T14:15:00Z'),
            comments: [],
          },
          {
            id: 9045,
            user: 'Student 6',
            body: 'The CSV export works perfectly. This dashboard will be extremely useful for our stakeholders.',
            state: 'APPROVED',
            submittedAt: new Date('2024-12-06T16:30:00Z'),
            comments: [],
          },
          {
            id: 9046,
            user: 'Student 4',
            body: 'A truly outstanding feature that brings a lot of value to our platform. Well done!',
            state: 'APPROVED',
            submittedAt: new Date('2024-12-06T17:45:00Z'),
            comments: [],
          },
        ],
      },
      {
        id: 2171165204,
        title:
          'refactor: Modularize codebase with better separation of concerns',
        user: 'Student 3',
        url: 'https://github.com/cs4218/cs4218-project-2024-team01/pull/38',
        state: 'closed',
        createdAt: new Date('2024-12-08T10:45:24Z'),
        updatedAt: new Date('2024-12-10T17:30:33Z'),
        reviews: [
          {
            id: 9047,
            user: 'Student 2',
            body: 'This is a major refactoring that significantly improves our code organization!',
            state: 'APPROVED',
            submittedAt: new Date('2024-12-08T13:15:00Z'),
            comments: [
              {
                id: 624,
                user: 'Student 2',
                body: 'I especially like the new service layer that separates business logic from the controllers.',
                createdAt: new Date('2024-12-08T13:17:00Z'),
              },
            ],
          },
          {
            id: 9048,
            user: 'Student 1',
            body: "While I appreciate the improved organization, I'm concerned about some circular dependencies.",
            state: 'CHANGES_REQUESTED',
            submittedAt: new Date('2024-12-08T15:30:00Z'),
            comments: [
              {
                id: 625,
                user: 'Student 1',
                body: "There's a circular import between the user service and the auth service.",
                createdAt: new Date('2024-12-08T15:32:00Z'),
              },
              {
                id: 626,
                user: 'Student 1',
                body: 'Also, the naming convention for services is inconsistent in some places.',
                createdAt: new Date('2024-12-08T15:35:00Z'),
              },
            ],
          },
          {
            id: 9049,
            user: 'Student 3',
            body: "I've fixed the circular dependencies by creating a shared types module and standardized the naming conventions.",
            state: 'COMMENTED',
            submittedAt: new Date('2024-12-09T09:45:00Z'),
            comments: [],
          },
          {
            id: 9050,
            user: 'Student 1',
            body: 'The circular dependency issues are resolved, and the naming is now consistent. Approving!',
            state: 'APPROVED',
            submittedAt: new Date('2024-12-09T11:20:00Z'),
            comments: [],
          },
          {
            id: 9051,
            user: 'Student 6',
            body: 'I love how this refactoring makes the code more maintainable. It will be much easier to onboard new team members now.',
            state: 'APPROVED',
            submittedAt: new Date('2024-12-09T14:15:00Z'),
            comments: [],
          },
          {
            id: 9052,
            user: 'Student 4',
            body: 'The increased test coverage for the refactored modules is impressive. This is how refactoring should be done!',
            state: 'APPROVED',
            submittedAt: new Date('2024-12-09T16:30:00Z'),
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
    aiInsights: {
      text: "Code Quality:\n  - The project has a high number of code smells, above the average, indicating potential maintainability issues and a need for code cleanup.\n  - Duplicated lines density is above the median, suggesting some code duplication which could be improved.\n  - The project has a low coverage, indicating a lack of testing. This raises concerns about the code's reliability and potential for undiscovered bugs. \n\n\nProject Management:\n  - Lines per commit are higher than the median, implying potentially infrequent commits which is generally a bad practice. However, the relatively low bugs per commit compared to the average may indicate sufficient testing before committing or integrating code.\n\nAgile Principles and Practices:\n -  While the frequency of commits appears reasonable, the high number of bugs and code smells per commit and PR indicate a deviation from agile best practices. The team may not be adequately prioritizing code quality and testing throughout the development process.\n\nSoftware Development Best Practices:\n  - The low line coverage reveals a critical gap in testing practices.  Comprehensive testing is fundamental to ensuring software quality and reliability.\n  - The high number of code smells indicates potential deviations from established coding standards and best practices.\n  -  The project exhibits some code duplication, indicating potential areas for code refactoring and consolidation.\n\nRecommendations:\n1. **Prioritize implementing comprehensive testing.** The low line coverage signify a critical need for more rigorous testing practices. Implement unit, integration, and system tests to improve code reliability and catch bugs early. Aim to achieve a higher level of test coverage gradually.\n2. **Address code quality issues.** The high number of code smells and duplicated code suggest opportunities for improvement. Introduce regular code reviews and static analysis tools to identify and address these issues promptly.  Encourage refactoring to eliminate duplicated code and improve maintainability.\n3. **Reinforce agile principles, particularly regarding quality.**  While the project appears to have reasonably sized commits and PRs, the high number of associated bugs and code smells indicates a need to integrate quality checks more effectively into the agile workflow. Consider implementing quality gates or checklists at different stages of the development process to prevent quality issues from accumulating.\n",
      date: new Date('2024-11-11T00:00:00Z'),
    },
  });
  team.teamData = teamData._id;
  await team.save();

  const issue1 = {
    self: 'trial_jira_issue1',
    id: 'trial_jira_issue1',
    key: 'Trial Planning Sprint1',
    fields: {
      summary: 'Implement API for Sprint 1',
      resolution: { name: 'Done' },
      issuetype: { name: 'story', subtask: false },
      status: { name: 'Done' },
      assignee: { displayName: 'John Doe' },
    },
    storyPoints: 3,
  };
  const issue2 = {
    self: 'trial_jira_issue2',
    id: 'trial_jira_issue2',
    key: 'Trial Planning Sprint1',
    fields: {
      summary: 'Implement SPA',
      resolution: { name: 'Done' },
      issuetype: { name: 'story', subtask: false },
      status: { name: 'Done' },
      assignee: { displayName: 'Johnny Smith' },
    },
    storyPoints: 2,
  };
  const issue3 = {
    self: 'trial_jira_issue3',
    id: 'trial_jira_issue3',
    key: 'Trial Planning Sprint2',
    fields: {
      summary: 'SetUp MongoDB',
      resolution: { name: 'Done' },
      issuetype: { name: 'story', subtask: false },
      status: { name: 'Done' },
      assignee: { displayName: 'Hoshimachi Suisei' },
    },
    storyPoints: 1,
  };
  const issue4 = {
    self: 'trial_jira_issue4',
    id: 'trial_jira_issue4',
    key: 'Trial Planning Sprint2',
    fields: {
      summary: 'Implement API for Sprint 2',
      resolution: { name: 'To Do' },
      issuetype: { name: 'story', subtask: false },
      status: { name: 'To Do' },
      assignee: { displayName: 'John Doe' },
    },
    storyPoints: 3,
  };
  const issue5 = {
    self: 'trial_jira_issue5',
    id: 'trial_jira_issue5',
    key: 'Trial Planning Sprint2',
    fields: {
      summary: 'Implement landing and hero page',
      resolution: { name: 'In progress' },
      issuetype: { name: 'story', subtask: false },
      status: { name: 'In progress' },
      assignee: { displayName: 'Johnny Smith' },
    },
    storyPoints: 3,
  };

  const issue1_doc = await JiraIssueModel.create(issue1);
  const issue2_doc = await JiraIssueModel.create(issue2);
  const issue3_doc = await JiraIssueModel.create(issue3);
  const issue4_doc = await JiraIssueModel.create(issue4);
  const issue5_doc = await JiraIssueModel.create(issue5);

  const sprint1 = {
    self: 'trial_jira_sprint1',
    id: 99990,
    name: 'Trial Planning Sprint1',
    state: 'closed',
    createdDate: new Date('2024-11-01T00:00:00Z'),
    startDate: new Date('2024-11-01T00:00:00Z'),
    endDate: new Date('2024-11-15T00:00:00Z'),
    originBoardId: 99999,
    goal: 'Plan and implement the basic features by week 5.',
    jiraIssues: [issue1_doc._id, issue2_doc._id],
  };
  const sprint2 = {
    self: 'trial_jira_sprint2',
    id: 99991,
    name: 'Trial Planning Sprint2',
    state: 'active',
    createdDate: new Date('2024-11-16T00:00:00Z'),
    startDate: new Date('2024-11-16T00:00:00Z'),
    endDate: new Date('2024-11-30T00:00:00Z'),
    originBoardId: 99999,
    goal: 'Implement full application with all features including tests by week 7.',
    jiraIssues: [issue3_doc._id, issue4_doc._id, issue5_doc._id],
  };
  const sprint1_doc = await JiraSprintModel.create(sprint1);
  const sprint2_doc = await JiraSprintModel.create(sprint2);

  const board = {
    self: 'trial_jira_board',
    id: 99999,
    name: 'Trial Planning Board',
    type: 'Trofos',
    course: trialCourse._id,
    columns: [{ name: 'To Do' }, { name: 'In progress' }, { name: 'Done' }],
    jiraLocation: {
      projectId: 99999,
      displayName: 'Team 100',
      projectName: 'Team 100',
      projectKey: 'Project Group 100',
      name: 'Team 100',
    },
    jiraIssues: [
      issue1_doc._id,
      issue2_doc._id,
      issue3_doc._id,
      issue4_doc._id,
      issue5_doc._id,
    ],
    jiraSprints: [sprint1_doc._id, sprint2_doc._id],
  };
  const board_doc = await JiraBoardModel.create(board);
  team.board = board_doc._id as unknown as JiraBoard;
  await team.save();

  const metrics = [
    'complexity',
    'duplicated_lines_density',
    'duplicated_lines',
    'functions',
    'security_remediation_effort',
    'classes',
    'statements',
    'quality_gate_details',
    'sqale_index',
    'sqale_rating',
    'bugs',
    'uncovered_conditions',
    'branch_coverage',
    'duplicated_files',
    'ncloc',
    'reliability_remediation_effort',
    'line_coverage',
    'lines',
    'coverage',
    'reliability_rating',
    'code_smells',
    'security_rating',
    'sqale_debt_ratio',
    'comment_lines_density',
    'security_hotspots',
    'alert_status',
    'comment_lines',
    'uncovered_lines',
    'cognitive_complexity',
    'duplicated_blocks',
    'files',
    'vulnerabilities',
    'bugs_per_commit',
    'lines_per_commit',
    'code_smells_per_commit',
    'bugs_per_pr',
    'lines_per_pr',
    'code_smells_per_pr',
    'lines_per_story_point',
    'overview_rank',
  ];
  const types = [
    'INT',
    'PERCENT',
    'INT',
    'INT',
    'WORK_DUR',
    'INT',
    'INT',
    'DATA',
    'WORK_DUR',
    'RATING',
    'INT',
    'INT',
    'PERCENT',
    'INT',
    'INT',
    'WORK_DUR',
    'PERCENT',
    'INT',
    'PERCENT',
    'RATING',
    'INT',
    'RATING',
    'PERCENT',
    'PERCENT',
    'INT',
    'LEVEL',
    'INT',
    'INT',
    'INT',
    'INT',
    'INT',
    'INT',
    'FLOAT',
    'FLOAT',
    'FLOAT',
    'FLOAT',
    'FLOAT',
    'FLOAT',
    'FLOAT',
    'INT',
  ];
  const domains = [
    'Complexity',
    'Duplications',
    'Duplications',
    'Size',
    'Security',
    'Size',
    'Size',
    'General',
    'Maintainability',
    'Maintainability',
    'Reliability',
    'Coverage',
    'Coverage',
    'Duplications',
    'Size',
    'Reliability',
    'Coverage',
    'Size',
    'Coverage',
    'Reliability',
    'Maintainability',
    'Security',
    'Maintainability',
    'Size',
    'SecurityReview',
    'Releasability',
    'Size',
    'Coverage',
    'Complexity',
    'Duplications',
    'Size',
    'Security',
    'Composite',
    'Composite',
    'Composite',
    'Composite',
    'Composite',
    'Composite',
    'Composite',
    'Overview',
  ];
  const metricStats = [
    {
      complexity: {
        median: 403,
        mean: 584.8,
      },
      duplicated_lines_density: {
        median: 8.9,
        mean: 11.059999999999999,
      },
      duplicated_lines: {
        median: 394,
        mean: 955.3,
      },
      functions: {
        median: 257.5,
        mean: 436.2,
      },
      security_remediation_effort: {
        median: 30,
        mean: 18,
      },
      classes: {
        median: 0,
        mean: 0.4,
      },
      statements: {
        median: 1114,
        mean: 1821.6,
      },
      sqale_index: {
        median: 473.5,
        mean: 689.7,
      },
      sqale_rating: {
        median: 1,
        mean: 1,
      },
      bugs: {
        median: 4.5,
        mean: 4.6,
      },
      duplicated_files: {
        median: 8,
        mean: 13,
      },
      ncloc: {
        median: 4815,
        mean: 6041.5,
      },
      reliability_remediation_effort: {
        median: 13,
        mean: 16.2,
      },
      line_coverage: {
        median: 0,
        mean: 5.14,
      },
      lines: {
        median: 5495.5,
        mean: 7216.7,
      },
      coverage: {
        median: 0,
        mean: 5.45,
      },
      reliability_rating: {
        median: 4,
        mean: 3.9,
      },
      code_smells: {
        median: 127,
        mean: 143.7,
      },
      security_rating: {
        median: 5,
        mean: 3.4,
      },
      sqale_debt_ratio: {
        median: 0.3,
        mean: 0.38,
      },
      comment_lines_density: {
        median: 6.55,
        mean: 7.17,
      },
      security_hotspots: {
        median: 3,
        mean: 16.9,
      },
      comment_lines: {
        median: 325.5,
        mean: 519.6,
      },
      uncovered_lines: {
        median: 1093.5,
        mean: 1744.6,
      },
      cognitive_complexity: {
        median: 214.5,
        mean: 215.2,
      },
      duplicated_blocks: {
        median: 17,
        mean: 81.7,
      },
      files: {
        median: 78.5,
        mean: 83.9,
      },
      vulnerabilities: {
        median: 1,
        mean: 0.6,
      },
      bugs_per_commit: {
        median: 0.333,
        mean: 0.5638571428571428,
      },
      lines_per_commit: {
        median: 381.231,
        mean: 632.6932857142857,
      },
      code_smells_per_commit: {
        median: 9.471,
        mean: 14.464285714285714,
      },
      bugs_per_pr: {
        median: 0.167,
        mean: 0.1885555555555556,
      },
      lines_per_pr: {
        median: 269.933,
        mean: 246.22322222222223,
      },
      code_smells_per_pr: {
        median: 5.933,
        mean: 5.942333333333333,
      },
    },
    {
      complexity: {
        median: 405,
        mean: 586.2,
      },
      duplicated_lines_density: {
        median: 8.8,
        mean: 10.9,
      },
      duplicated_lines: {
        median: 390,
        mean: 950.5,
      },
      functions: {
        median: 258,
        mean: 437.0,
      },
      security_remediation_effort: {
        median: 30,
        mean: 18,
      },
      classes: {
        median: 0,
        mean: 0.4,
      },
      statements: {
        median: 1116,
        mean: 1823.0,
      },
      sqale_index: {
        median: 470,
        mean: 687.5,
      },
      sqale_rating: {
        median: 1,
        mean: 1,
      },
      bugs: {
        median: 4,
        mean: 4.5,
      },
      duplicated_files: {
        median: 8,
        mean: 12.8,
      },
      ncloc: {
        median: 4820,
        mean: 6045.0,
      },
      reliability_remediation_effort: {
        median: 13,
        mean: 16.2,
      },
      line_coverage: {
        median: 0,
        mean: 5.2,
      },
      lines: {
        median: 5500,
        mean: 7220.0,
      },
      coverage: {
        median: 0,
        mean: 5.5,
      },
      reliability_rating: {
        median: 4,
        mean: 3.9,
      },
      code_smells: {
        median: 126,
        mean: 142.5,
      },
      security_rating: {
        median: 5,
        mean: 3.4,
      },
      sqale_debt_ratio: {
        median: 0.3,
        mean: 0.37,
      },
      comment_lines_density: {
        median: 6.6,
        mean: 7.2,
      },
      security_hotspots: {
        median: 3,
        mean: 16.8,
      },
      comment_lines: {
        median: 330,
        mean: 520.0,
      },
      uncovered_lines: {
        median: 1090,
        mean: 1740.0,
      },
      cognitive_complexity: {
        median: 213,
        mean: 214.5,
      },
      duplicated_blocks: {
        median: 17,
        mean: 81.5,
      },
      files: {
        median: 79,
        mean: 84.0,
      },
      vulnerabilities: {
        median: 1,
        mean: 0.6,
      },
      bugs_per_commit: {
        median: 0.33,
        mean: 0.56,
      },
      lines_per_commit: {
        median: 382.0,
        mean: 633.0,
      },
      code_smells_per_commit: {
        median: 9.45,
        mean: 14.4,
      },
      bugs_per_pr: {
        median: 0.165,
        mean: 0.187,
      },
      lines_per_pr: {
        median: 270.0,
        mean: 246.5,
      },
      code_smells_per_pr: {
        median: 5.93,
        mean: 5.94,
      },
      lines_per_story_point: {
        median: 260.0,
        mean: 447.5,
      },
      uncovered_conditions: {
        median: 21,
        mean: 21,
      },
      branch_coverage: {
        median: 82.0,
        mean: 82.0,
      },
    },
    {
      complexity: {
        median: 407,
        mean: 587.5,
      },
      duplicated_lines_density: {
        median: 8.7,
        mean: 10.8,
      },
      duplicated_lines: {
        median: 385,
        mean: 945.0,
      },
      functions: {
        median: 259,
        mean: 438.0,
      },
      security_remediation_effort: {
        median: 30,
        mean: 18,
      },
      classes: {
        median: 0,
        mean: 0.4,
      },
      statements: {
        median: 1118,
        mean: 1825.0,
      },
      sqale_index: {
        median: 465,
        mean: 685.0,
      },
      sqale_rating: {
        median: 1,
        mean: 1,
      },
      bugs: {
        median: 4,
        mean: 4.4,
      },
      duplicated_files: {
        median: 8,
        mean: 12.6,
      },
      ncloc: {
        median: 4825,
        mean: 6050.0,
      },
      reliability_remediation_effort: {
        median: 13,
        mean: 16.2,
      },
      line_coverage: {
        median: 0,
        mean: 5.3,
      },
      lines: {
        median: 5505,
        mean: 7225.0,
      },
      coverage: {
        median: 0,
        mean: 5.6,
      },
      reliability_rating: {
        median: 4,
        mean: 3.9,
      },
      code_smells: {
        median: 125,
        mean: 141.0,
      },
      security_rating: {
        median: 5,
        mean: 3.4,
      },
      sqale_debt_ratio: {
        median: 0.3,
        mean: 0.36,
      },
      comment_lines_density: {
        median: 6.7,
        mean: 7.3,
      },
      security_hotspots: {
        median: 3,
        mean: 16.7,
      },
      comment_lines: {
        median: 335,
        mean: 525.0,
      },
      uncovered_lines: {
        median: 1085,
        mean: 1735.0,
      },
      cognitive_complexity: {
        median: 212,
        mean: 213.8,
      },
      duplicated_blocks: {
        median: 17,
        mean: 81.0,
      },
      files: {
        median: 80,
        mean: 84.5,
      },
      vulnerabilities: {
        median: 1,
        mean: 0.6,
      },
      bugs_per_commit: {
        median: 0.325,
        mean: 0.555,
      },
      lines_per_commit: {
        median: 383.0,
        mean: 634.0,
      },
      code_smells_per_commit: {
        median: 9.4,
        mean: 14.3,
      },
      bugs_per_pr: {
        median: 0.16,
        mean: 0.185,
      },
      lines_per_pr: {
        median: 271.0,
        mean: 247.0,
      },
      code_smells_per_pr: {
        median: 5.92,
        mean: 5.93,
      },
      lines_per_story_point: {
        median: 261.0,
        mean: 448.0,
      },
      uncovered_conditions: {
        median: 20,
        mean: 20,
      },
      branch_coverage: {
        median: 82.2,
        mean: 82.2,
      },
    },
    {
      complexity: {
        median: 410,
        mean: 589.0,
      },
      duplicated_lines_density: {
        median: 8.6,
        mean: 10.7,
      },
      duplicated_lines: {
        median: 380,
        mean: 940.0,
      },
      functions: {
        median: 260,
        mean: 439.0,
      },
      security_remediation_effort: {
        median: 30,
        mean: 18,
      },
      classes: {
        median: 0,
        mean: 0.4,
      },
      statements: {
        median: 1120,
        mean: 1827.0,
      },
      sqale_index: {
        median: 460,
        mean: 682.0,
      },
      sqale_rating: {
        median: 1,
        mean: 1,
      },
      bugs: {
        median: 4,
        mean: 4.3,
      },
      duplicated_files: {
        median: 8,
        mean: 12.4,
      },
      ncloc: {
        median: 4830,
        mean: 6055.0,
      },
      reliability_remediation_effort: {
        median: 13,
        mean: 16.2,
      },
      line_coverage: {
        median: 0,
        mean: 5.4,
      },
      lines: {
        median: 5510,
        mean: 7230.0,
      },
      coverage: {
        median: 0,
        mean: 5.7,
      },
      reliability_rating: {
        median: 4,
        mean: 3.9,
      },
      code_smells: {
        median: 124,
        mean: 140.0,
      },
      security_rating: {
        median: 5,
        mean: 3.4,
      },
      sqale_debt_ratio: {
        median: 0.3,
        mean: 0.35,
      },
      comment_lines_density: {
        median: 6.8,
        mean: 7.4,
      },
      security_hotspots: {
        median: 3,
        mean: 16.6,
      },
      comment_lines: {
        median: 340,
        mean: 530.0,
      },
      uncovered_lines: {
        median: 1080,
        mean: 1730.0,
      },
      cognitive_complexity: {
        median: 211,
        mean: 213.0,
      },
      duplicated_blocks: {
        median: 17,
        mean: 80.5,
      },
      files: {
        median: 81,
        mean: 85.0,
      },
      vulnerabilities: {
        median: 1,
        mean: 0.6,
      },
      bugs_per_commit: {
        median: 0.32,
        mean: 0.55,
      },
      lines_per_commit: {
        median: 384.0,
        mean: 635.0,
      },
      code_smells_per_commit: {
        median: 9.35,
        mean: 14.2,
      },
      bugs_per_pr: {
        median: 0.155,
        mean: 0.183,
      },
      lines_per_pr: {
        median: 272.0,
        mean: 247.5,
      },
      code_smells_per_pr: {
        median: 5.91,
        mean: 5.92,
      },
      lines_per_story_point: {
        median: 262.0,
        mean: 448.5,
      },
      uncovered_conditions: {
        median: 19,
        mean: 19,
      },
      branch_coverage: {
        median: 82.4,
        mean: 82.4,
      },
    },
    {
      complexity: {
        median: 412,
        mean: 590.5,
      },
      duplicated_lines_density: {
        median: 8.5,
        mean: 10.6,
      },
      duplicated_lines: {
        median: 375,
        mean: 935.0,
      },
      functions: {
        median: 261,
        mean: 440.0,
      },
      security_remediation_effort: {
        median: 30,
        mean: 18,
      },
      classes: {
        median: 0,
        mean: 0.4,
      },
      statements: {
        median: 1122,
        mean: 1829.0,
      },
      sqale_index: {
        median: 455,
        mean: 680.0,
      },
      sqale_rating: {
        median: 1,
        mean: 1,
      },
      bugs: {
        median: 4,
        mean: 4.2,
      },
      duplicated_files: {
        median: 8,
        mean: 12.2,
      },
      ncloc: {
        median: 4835,
        mean: 6060.0,
      },
      reliability_remediation_effort: {
        median: 13,
        mean: 16.2,
      },
      line_coverage: {
        median: 0,
        mean: 5.5,
      },
      lines: {
        median: 5515,
        mean: 7235.0,
      },
      coverage: {
        median: 0,
        mean: 5.8,
      },
      reliability_rating: {
        median: 4,
        mean: 3.9,
      },
      code_smells: {
        median: 123,
        mean: 139.0,
      },
      security_rating: {
        median: 5,
        mean: 3.4,
      },
      sqale_debt_ratio: {
        median: 0.3,
        mean: 0.34,
      },
      comment_lines_density: {
        median: 6.9,
        mean: 7.5,
      },
      security_hotspots: {
        median: 3,
        mean: 16.5,
      },
      comment_lines: {
        median: 345,
        mean: 535.0,
      },
      uncovered_lines: {
        median: 1075,
        mean: 1725.0,
      },
      cognitive_complexity: {
        median: 210,
        mean: 212.5,
      },
      duplicated_blocks: {
        median: 17,
        mean: 80.0,
      },
      files: {
        median: 82,
        mean: 85.5,
      },
      vulnerabilities: {
        median: 1,
        mean: 0.6,
      },
      bugs_per_commit: {
        median: 0.315,
        mean: 0.545,
      },
      lines_per_commit: {
        median: 385.0,
        mean: 636.0,
      },
      code_smells_per_commit: {
        median: 9.3,
        mean: 14.1,
      },
      bugs_per_pr: {
        median: 0.15,
        mean: 0.18,
      },
      lines_per_pr: {
        median: 273.0,
        mean: 248.0,
      },
      code_smells_per_pr: {
        median: 5.9,
        mean: 5.91,
      },
      lines_per_story_point: {
        median: 263.0,
        mean: 449.0,
      },
      uncovered_conditions: {
        median: 18,
        mean: 18,
      },
      branch_coverage: {
        median: 82.6,
        mean: 82.6,
      },
    },
  ];

  const codeAnalysisData = [
    {
      executionTime: new Date('2024-11-01T00:00:00Z'),
      gitHubOrgName: trialCourse.gitHubOrgName,
      repoName: teamData.repoName,
      teamId: teamData.teamId,
      metrics,
      types,
      domains,
      values: [
        '378',
        '9.3',
        '394',
        '234',
        '0',
        '0',
        '1002',
        '{"level":"OK","conditions":[],"ignoredConditions":false}',
        '444',
        '1.0',
        '2',
        '22',
        '81.8',
        '8',
        '3786',
        '10',
        '51.4',
        '4217',
        '54.5',
        '3.0',
        '108',
        '1.0',
        '0.4',
        '5.0',
        '2',
        'OK',
        '199',
        '518',
        '212',
        '17',
        '59',
        '0',
        '0.222',
        '420.667',
        '12.000',
        '0.167',
        '315.500',
        '9.000',
        '267.92',
        '1',
      ],
      metricStats: metricStats[0],
      lines_per_story_point: {
        median: 259.568,
        mean: 447.095875,
      },
      uncovered_conditions: {
        median: 22,
        mean: 22,
      },
      branch_coverage: {
        median: 81.8,
        mean: 81.8,
      },
    },
    {
      executionTime: new Date('2024-11-02T00:00:00Z'),
      gitHubOrgName: trialCourse.gitHubOrgName,
      repoName: teamData.repoName,
      teamId: teamData.teamId,
      metrics,
      types,
      domains,
      values: [
        '380',
        '9.4',
        '400',
        '235',
        '0',
        '0',
        '1005',
        '{"level":"OK","conditions":[],"ignoredConditions":false}',
        '445',
        '1.0',
        '3',
        '25',
        '80.5',
        '9',
        '3790',
        '12',
        '50.8',
        '4220',
        '54.0',
        '3.0',
        '110',
        '1.0',
        '0.5',
        '5.1',
        '3',
        'OK',
        '200',
        '520',
        '215',
        '18',
        '60',
        '0',
        '0.230',
        '421.000',
        '12.200',
        '0.170',
        '316.000',
        '9.100',
        '254.50',
        '1',
      ],
      metricStats: metricStats[1],
    },
    {
      executionTime: new Date('2024-11-03T00:00:00Z'),
      gitHubOrgName: trialCourse.gitHubOrgName,
      repoName: teamData.repoName,
      teamId: teamData.teamId,
      metrics,
      types,
      domains,
      values: [
        '385',
        '9.6',
        '410',
        '237',
        '0',
        '0',
        '1010',
        '{"level":"OK","conditions":[],"ignoredConditions":false}',
        '450',
        '1.0',
        '4',
        '28',
        '79.0',
        '10',
        '3800',
        '15',
        '49.5',
        '4230',
        '53.2',
        '3.0',
        '115',
        '1.0',
        '0.6',
        '5.0',
        '4',
        'OK',
        '205',
        '530',
        '220',
        '19',
        '61',
        '0',
        '0.240',
        '422.000',
        '12.500',
        '0.180',
        '317.000',
        '9.300',
        '241.25',
        '1',
      ],
      metricStats: metricStats[2],
    },
    {
      executionTime: new Date('2024-11-04T00:00:00Z'),
      gitHubOrgName: trialCourse.gitHubOrgName,
      repoName: teamData.repoName,
      teamId: teamData.teamId,
      metrics,
      types,
      domains,
      values: [
        '383',
        '9.2',
        '395',
        '239',
        '0',
        '0',
        '1015',
        '{"level":"OK","conditions":[],"ignoredConditions":false}',
        '442',
        '1.0',
        '2',
        '20',
        '81.0',
        '8',
        '3810',
        '11',
        '51.0',
        '4240',
        '54.5',
        '3.0',
        '108',
        '1.0',
        '0.4',
        '5.3',
        '2',
        'OK',
        '210',
        '525',
        '210',
        '18',
        '62',
        '0',
        '0.210',
        '423.000',
        '11.800',
        '0.160',
        '318.000',
        '8.900',
        '302.47',
        '1',
      ],
      metricStats: metricStats[3],
    },
    {
      executionTime: new Date('2024-11-05T00:00:00Z'),
      gitHubOrgName: trialCourse.gitHubOrgName,
      repoName: teamData.repoName,
      teamId: teamData.teamId,
      metrics,
      types,
      domains,
      values: [
        '390',
        '9.0',
        '380',
        '240',
        '0',
        '0',
        '1020',
        '{"level":"OK","conditions":[],"ignoredConditions":false}',
        '438',
        '1.0',
        '1',
        '18',
        '82.0',
        '7',
        '3820',
        '10',
        '52.0',
        '4250',
        '55.0',
        '3.0',
        '105',
        '1.0',
        '0.3',
        '5.5',
        '1',
        'OK',
        '215',
        '515',
        '205',
        '17',
        '63',
        '0',
        '0.200',
        '424.000',
        '11.000',
        '0.150',
        '319.000',
        '8.500',
        '294.59',
        '1',
      ],
      metricStats: metricStats[4],
    },
  ];
  for (const data of codeAnalysisData) {
    await codeAnalysisDataModel.create(data);
  }

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
      { text: 'Yes', points: 10 },
      { text: 'No', points: 0 },
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

  const startDate = new Date(START_DATE_STRING);
  startDate.setUTCFullYear(new Date(START_DATE_STRING).getUTCFullYear() - 1);

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

  async function createNewUsersAndTeam(
    teamNumber: number,
    userSpecs: { identifier: string; name: string }[]
  ) {
    const newUserIds: string[] = [];
    for (const spec of userSpecs) {
      let newStudent = await UserModel.findOne({ identifier: spec.identifier });
      if (!newStudent) {
        newStudent = await UserModel.create({
          identifier: spec.identifier,
          name: spec.name,
          enrolledCourses: [trialCourse._id],
          gitHandle: '',
        });
        await AccountModel.create({
          email: `${spec.identifier}@example.com`,
          password:
            '$2b$10$UslurkMG9ujw5vqMWqvxheF4zLmWE78XZ9QAeEW637GiyLvXk3EG6',
          crispRole: CrispRole.Normal,
          isApproved: true,
          wantsEmailNotifications: false,
          wantsTelegramNotifications: false,
          user: newStudent._id,
          courseRoles: [],
        });
      } else {
        if (!newStudent.enrolledCourses.includes(trialCourse._id)) {
          newStudent.enrolledCourses.push(trialCourse._id);
          let studentAccount = await AccountModel.findOne({
            user: newStudent._id,
          });
          if (!studentAccount) {
            studentAccount = await AccountModel.create({
              email: `${spec.identifier}@example.com`,
              password:
                '$2b$10$UslurkMG9ujw5vqMWqvxheF4zLmWE78XZ9QAeEW637GiyLvXk3EG6',
              crispRole: CrispRole.Normal,
              isApproved: true,
              wantsEmailNotifications: false,
              wantsTelegramNotifications: false,
              user: newStudent._id,
              courseRoles: [],
            });
          }
          studentAccount.courseRoles.push({
            course: trialCourse._id.toString(),
            courseRole: CourseRole.Student,
          });
          await studentAccount.save();
          await newStudent.save();
        }
      }
      if (!trialCourse.students.includes(newStudent._id)) {
        trialCourse.students.push(newStudent._id);
        await trialCourse.save();
      }
      newUserIds.push(newStudent._id.toString());
    }

    const newTeam = await TeamModel.create({
      teamSet: teamSet._id,
      number: teamNumber,
      members: newUserIds,
      TA: trialUser!._id,
    });
    teamSet.teams.push(newTeam._id);
    await teamSet.save();

    const complexityVal = 110 + (teamNumber % 100) * 10;
    const coverageVal = (teamNumber % 5) * 10 + 50;
    const codeSmellsVal = (teamNumber % 4) * 20 + 30;

    const newTeamData = await TeamDataModel.create({
      teamId: newTeam.number,
      course: trialCourse._id,
      gitHubOrgName: 'org',
      repoName: `team${teamNumber}`,
      commits: 10,
      issues: 2,
      pullRequests: 1,
      weeklyCommits: [[1, 3, 1]],
      updatedIssues: [`#${teamNumber}-1`, `#${teamNumber}-2`],
      teamContributions: {
        [userSpecs[0].name]: {
          commits: 3,
          createdIssues: 1,
          openIssues: 0,
          closedIssues: 1,
          pullRequests: 0,
          codeReviews: 1,
          comments: 2,
        },
        [userSpecs[1].name]: {
          commits: 2,
          createdIssues: 1,
          openIssues: 1,
          closedIssues: 0,
          pullRequests: 1,
          codeReviews: 0,
          comments: 1,
        },
        [userSpecs[2].name]: {
          commits: 4,
          createdIssues: 1,
          openIssues: 0,
          closedIssues: 1,
          pullRequests: 0,
          codeReviews: 1,
          comments: 3,
        },
      },
      teamPRs: [
        {
          id: 30000 + teamNumber,
          title: 'Initial Setup',
          user: userSpecs[0].name,
          url: `https://github.com/cs4218/cs4218-project-2024-team${teamNumber}/pull/1`,
          state: 'closed',
          createdAt: new Date('2024-11-08T12:00:00Z'),
          updatedAt: new Date('2024-11-08T13:00:00Z'),
          reviews: [
            {
              id: 5000 + teamNumber,
              user: userSpecs[1].name,
              body: 'Good start, but we might need more validations on user input.',
              state: 'COMMENTED',
              submittedAt: new Date('2024-11-08T12:15:00Z'),
              comments: [],
            },
            {
              id: 5010 + teamNumber,
              user: userSpecs[2].name,
              body: 'LGTM! Let’s proceed to integrate this with the CI pipeline.',
              state: 'APPROVED',
              submittedAt: new Date('2024-11-08T12:30:00Z'),
              comments: [
                {
                  id: 5011 + teamNumber,
                  user: userSpecs[2].name,
                  body: 'Be sure to include coverage reports in the pipeline as well!',
                  createdAt: new Date('2024-11-08T12:40:00Z'),
                },
              ],
            },
          ],
        },
      ],
      milestones: [
        {
          title: `Team${teamNumber} Setup`,
          description: `Initial environment for Team${teamNumber}.`,
          open_issues: 0,
          closed_issues: 2,
          state: 'closed',
          created_at: new Date('2024-11-01T00:00:00Z'),
          updated_at: new Date('2024-11-02T00:00:00Z'),
          due_on: new Date('2024-11-05T00:00:00Z'),
          closed_at: new Date('2024-11-04T00:00:00Z'),
        },
      ],
      aiInsights: {
        text: 'Code Quality:\n  - The project has a low number of code smells, significantly above the average, indicating good maintainability and code quality.\n  - The project has a high coverage (0.0%), indicating a strong testing framework. \n\nProject Management:\n  - Lines per commit are lower than the average, implying potentially frequent commits which is generally a good practice. However, the relatively high bugs per commit may indicate insufficient testing before committing or integrating code. \n\n\nAgile Principles and Practices:\n -  The team has a good frequency of commits, and sufficient testing as shown by the low bugs per commit and low code smells per commit.\n  - The low number of code smells indicates low deviations from established coding standards and best practices.\n  -  The project exhibits some code duplication, indicating potential areas for code refactoring and consolidation.\n\nRecommendations:\n1. **Continue implementing comprehensive testing.** The  high line coverage signify rigorous testing practices. Continue mplementing unit, integration, and system tests to improve code reliability and catch bugs early.\n2. **Address code quality issues.** The number of code smells and duplicated code suggest there still exists some opportunities for improvement. Introduce regular code reviews and static analysis tools to identify and address these issues promptly.  Encourage refactoring to eliminate duplicated code and improve maintainability.\n3. **Reinforce agile principles, particularly regarding quality.**  While the project appears to have reasonably sized commits and PRs, the moderate number of associated bugs and code smells indicates a need to integrate quality checks more effectively into the agile workflow. Consider implementing quality gates or checklists at different stages of the development process to prevent quality issues from accumulating.\n',
        date: new Date('2024-11-05T00:00:00Z'),
      },
    });
    newTeam.teamData = newTeamData._id;
    await newTeam.save();

    const tIssue1 = await JiraIssueModel.create({
      self: `trial_jira_team${teamNumber}_issue1`,
      id: `trial_jira_team${teamNumber}_issue1`,
      key: `Team${teamNumber} Sprint1`,
      fields: {
        summary: `Team${teamNumber} initial environment`,
        resolution: { name: 'Done' },
        issuetype: { name: 'story', subtask: false },
        status: { name: 'Done' },
        assignee: { displayName: userSpecs[0].name },
      },
      storyPoints: 2,
    });
    const tIssue2 = await JiraIssueModel.create({
      self: `trial_jira_team${teamNumber}_issue2`,
      id: `trial_jira_team${teamNumber}_issue2`,
      key: `Team${teamNumber} Sprint1`,
      fields: {
        summary: `Team${teamNumber} basic feature`,
        resolution: { name: 'In progress' },
        issuetype: { name: 'story', subtask: false },
        status: { name: 'In progress' },
        assignee: { displayName: userSpecs[1].name },
      },
      storyPoints: 1,
    });
    const tSprint = await JiraSprintModel.create({
      self: `trial_jira_team${teamNumber}_sprint1`,
      id: 110000 + teamNumber,
      name: `Team${teamNumber} Sprint1`,
      state: 'active',
      createdDate: new Date('2024-11-01T10:00:00Z'),
      startDate: new Date('2024-11-01T10:00:00Z'),
      endDate: new Date('2024-11-10T10:00:00Z'),
      originBoardId: 110000 + teamNumber,
      goal: `Team${teamNumber} first sprint goal`,
      jiraIssues: [tIssue1._id, tIssue2._id],
    });
    const tBoard = await JiraBoardModel.create({
      self: `trial_jira_team${teamNumber}_board`,
      id: 110000 + teamNumber,
      name: `Team ${teamNumber} Board`,
      type: 'Trofos',
      course: trialCourse._id,
      columns: [{ name: 'To Do' }, { name: 'In progress' }, { name: 'Done' }],
      jiraLocation: {
        projectId: 110000 + teamNumber,
        displayName: `Team${teamNumber}`,
        projectName: `Team${teamNumber}`,
        projectKey: `Team${teamNumber}Key`,
        name: `Team${teamNumber}`,
      },
      jiraIssues: [tIssue1._id, tIssue2._id],
      jiraSprints: [tSprint._id],
    });
    newTeam.board = tBoard._id as unknown as JiraBoard;
    await newTeam.save();
    const creationDate = new Date('2024-11-01T00:00:00Z');
    const cognitiveComp = 50;
    for (let i = 0; i < 5; i++) {
      await codeAnalysisDataModel.create({
        executionTime: creationDate,
        gitHubOrgName: trialCourse.gitHubOrgName,
        repoName: newTeamData.repoName,
        teamId: newTeamData.teamId,
        metrics,
        types,
        domains,
        values: [
          (complexityVal + i * 10).toString(),
          '5.0',
          '200',
          '100',
          '0',
          '0',
          '500',
          '{"level":"OK","conditions":[],"ignoredConditions":false}',
          '200',
          '1.0',
          '1',
          '10',
          '60.0',
          '5',
          '1000',
          '5',
          coverageVal.toString(),
          '1200',
          (coverageVal + 10).toString(),
          '2.0',
          codeSmellsVal.toString(),
          '1.0',
          '0.3',
          '5.0',
          '1',
          'OK',
          '50',
          '100',
          (cognitiveComp + i * 5).toString(),
          '5',
          '10',
          '0',
          '0.200',
          '150.000',
          '2.000',
          '0.100',
          '50.000',
          '2.500',
          '100.00',
          (teamNumber - 99).toString(),
        ],
        metricStats: metricStats[i],
      });
      creationDate.setDate(creationDate.getDate() + 1);
    }
  }

  await createNewUsersAndTeam(101, [
    { identifier: 'alice-lin', name: 'Alice Lin' },
    { identifier: 'bob-chen', name: 'Bob Chen' },
    { identifier: 'charlie-woo', name: 'Charlie Woo' },
  ]);
  await createNewUsersAndTeam(102, [
    { identifier: 'veronica-tan', name: 'Veronica Tan' },
    { identifier: 'michael-ong', name: 'Michael Ong' },
    { identifier: 'jason-lee', name: 'Jason Lee' },
  ]);
  await createNewUsersAndTeam(103, [
    { identifier: 'tanaka-tanaka', name: 'Tanaka Tanaka' },
    { identifier: 'jonathan-seah', name: 'Jonathan Seah' },
    { identifier: 'poh-ling', name: 'Poh Ling' },
  ]);
  await createNewUsersAndTeam(104, [
    { identifier: 'alex-ho', name: 'Alex Ho' },
    { identifier: 'kim-yang', name: 'Kim Yang' },
    { identifier: 'rosalin-chan', name: 'Rosalin Chan' },
  ]);

  const assignmentSet = await AssessmentAssignmentSetModel.create({
    assessment: assessment._id,
    assignedTeams: [
      { team, tas: [trialUser] },
      { team: await TeamModel.findOne({ number: 101 }), tas: [trialUser] },
      { team: await TeamModel.findOne({ number: 102 }), tas: [trialUser] },
      { team: await TeamModel.findOne({ number: 103 }), tas: [trialUser] },
      { team: await TeamModel.findOne({ number: 104 }), tas: [trialUser] },
    ] as AssignedTeam[],
  });
  await assignmentSet.save();

  assessment.assessmentAssignmentSet = assignmentSet._id;
  await assessment.save();

  console.log(
    'Trial data setup complete! All old trial data replaced with fresh, more realistic data.'
  );
};

export default setupTutorialDataJob;
