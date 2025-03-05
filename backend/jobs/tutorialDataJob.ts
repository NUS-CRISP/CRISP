import AccountModel from '@models/Account';
import CourseModel from '@models/Course';
import TeamModel from '@models/Team';
import TeamDataModel from '@models/TeamData';
import TeamSetModel from '@models/TeamSet';
import UserModel from '@models/User';
import Role from '@shared/types/auth/Role';

export const setupTutorialDataJob = async () => {
  // -----------------------------------------------------------------------------
  // 1) Ensure the "Trial User" (and its account) exists
  // -----------------------------------------------------------------------------
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

  // -----------------------------------------------------------------------------
  // 2) Delete existing trial course data so we can regenerate from scratch
  // -----------------------------------------------------------------------------
  const existingTrialCourse = await CourseModel.findOne({ code: 'TRIAL' });
  if (existingTrialCourse) {
    const trialCourseId = existingTrialCourse._id;

    const teamSets = await TeamSetModel.find({ course: trialCourseId });
    const teamSetIds = teamSets.map(ts => ts._id);

    await TeamModel.deleteMany({ teamSet: { $in: teamSetIds } });

    await TeamSetModel.deleteMany({ _id: { $in: teamSetIds } });

    await TeamDataModel.deleteMany({ course: trialCourseId });

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

  // -----------------------------------------------------------------------------
  // 3) Now we can create the brand-new trial course and data
  // -----------------------------------------------------------------------------
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
  trialCourse.gitHubOrgName = 'trialrepo'; // Has to be saved separately. I don't know why, but assigning it directly in the .create method above doesn't correctly save it.
  await trialCourse.save();

  trialCourse.faculty.push(trialUser._id);
  trialCourse.faculty.push(adminUser._id);
  await trialCourse.save();

  if (!trialUser.enrolledCourses.includes(trialCourse._id)) {
    trialUser.enrolledCourses.push(trialCourse._id);
    await trialUser.save();
  }

  // -----------------------------------------------------------------------------
  // 4) Create or reuse any bogus students + enroll them
  // -----------------------------------------------------------------------------
  const studentArray: string[] = [];

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
    studentArray.push(studentUser._id.toString());
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

  // -----------------------------------------------------------------------------
  // 5) Create a TeamSet, Team, and TeamData with multiple example subdocuments
  // -----------------------------------------------------------------------------
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
    members: studentArray,
    TA: trialUser._id,
  });
  teamSet.teams.push(team._id);
  await teamSet.save();

  // Now let's create TeamData with arrays filled in:
  const teamData = await TeamDataModel.create({
    teamId: team.number,
    course: trialCourse._id,
    gitHubOrgName: 'org',
    repoName: 'team',

    // Example summary stats
    commits: 42,
    issues: 5,
    pullRequests: 3,

    // Weekly commits: suppose we have 3 weeks, each with 3 days of commits
    weeklyCommits: [
      [1, 4, 2],
      [0, 2, 5],
      [3, 1, 3],
    ],

    updatedIssues: [
      '#12 Fix login bug',
      '#15 Update README',
      '#20 Minor UI improvements',
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

  console.log(
    'Trial data setup complete! All old trial data replaced with fresh data.'
  );
};

export default setupTutorialDataJob;
