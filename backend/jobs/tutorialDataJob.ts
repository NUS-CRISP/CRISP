import AccountModel from '@models/Account';
import CourseModel from '@models/Course';
import TeamModel from '@models/Team';
import TeamDataModel from '@models/TeamData';
import TeamSetModel from '@models/TeamSet';
import UserModel from '@models/User';
import Role from '@shared/types/auth/Role';

export const setupTutorialDataJob = async () => {
  /*
   * 1) Ensure the "Trial User" (and its account) exists.
   * 2) Delete existing trial course data (identified by code: "TRIAL"),
   *    removing old TeamSets, Teams, TeamDatas, and any bogus students from that course.
   * 3) Re-create the trial course, add the trial user and admin user to it,
   *    create bogus students, then a new TeamSet, Team, and fill out TeamData
   *    with multi-entry arrays for demonstration.
   */

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

  // If the trial user doesn't exist, create it
  if (!trialUser) {
    const trialUserDoc = new UserModel({
      identifier: 'trial',
      name: 'Trial User',
      enrolledCourses: [],
      gitHandle: '',
    });
    trialUser = await trialUserDoc.save();
  }

  // If the trial account doesn't exist, create it
  if (!trialAccount) {
    const trialAccountDoc = new AccountModel({
      email: 'trial@example.com',
      password: '$2b$10$UslurkMG9ujw5vqMWqvxheF4zLmWE78XZ9QAeEW637GiyLvXk3EG6', // Provided hashed password
      role: 'Trial User',
      isApproved: true,
      wantsEmailNotifications: false,
      wantsTelegramNotifications: false,
      user: trialUser._id,
    });
    trialAccount = await trialAccountDoc.save();
  }

  // Ensure we have an Admin user
  const adminAccount = await AccountModel.findOne({ role: Role.Admin }).populate('user');
  if (!adminAccount || !adminAccount.user) {
    throw new Error('Admin user does not exist, but is required by this script.');
  }
  const adminUser = adminAccount.user;

  // -----------------------------------------------------------------------------
  // 2) Delete existing trial course data so we can regenerate from scratch
  // -----------------------------------------------------------------------------
  const existingTrialCourse = await CourseModel.findOne({ code: 'TRIAL' });
  if (existingTrialCourse) {
    const trialCourseId = existingTrialCourse._id;

    // 2a) Remove TeamSet(s) for this course
    const teamSets = await TeamSetModel.find({ course: trialCourseId });
    const teamSetIds = teamSets.map((ts) => ts._id);

    // 2b) Remove Teams referencing these team sets
    await TeamModel.deleteMany({ teamSet: { $in: teamSetIds } });

    // 2c) Remove the team sets
    await TeamSetModel.deleteMany({ _id: { $in: teamSetIds } });

    // 2d) Remove TeamData referencing this course
    await TeamDataModel.deleteMany({ course: trialCourseId });

    // 2e) Remove any “bogus” student users (and their accounts) who are part of this course,
    //     except if they are the trial user or the admin user.
    const existingCourseRefreshed = await CourseModel.findById(trialCourseId).lean();
    if (existingCourseRefreshed?.students) {
      // IDs of the trial user & admin user we want to keep
      const keepUserIds = new Set([trialUser._id.toString(), adminUser._id.toString()]);

      // Identify which are "bogus" for removal
      const bogusStudentIds = existingCourseRefreshed.students.filter(
        (stuId: any) => !keepUserIds.has(stuId.toString())
      );

      if (bogusStudentIds.length > 0) {
        // Remove accounts referencing those user IDs
        await AccountModel.deleteMany({ user: { $in: bogusStudentIds } });
        // Remove the user docs themselves
        await UserModel.deleteMany({ _id: { $in: bogusStudentIds } });
      }
    }

    // 2f) Finally, remove the course itself
    await CourseModel.deleteOne({ _id: trialCourseId });
  }

  // -----------------------------------------------------------------------------
  // 3) Now we can create the brand-new trial course and data
  // -----------------------------------------------------------------------------
  // Re-create the trial course
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

  // Attach trial user and admin user as faculty
  trialCourse.faculty.push(trialUser._id);
  trialCourse.faculty.push(adminUser._id);
  await trialCourse.save();

  // Ensure the trial user is enrolled in the new course
  if (!trialUser.enrolledCourses.includes(trialCourse._id)) {
    trialUser.enrolledCourses.push(trialCourse._id);
    await trialUser.save();
  }

  // -----------------------------------------------------------------------------
  // 4) Create or reuse any bogus students + enroll them
  // -----------------------------------------------------------------------------
  const studentArray: string[] = [];

  const createAndEnrollStudent = async (
    { identifier, name }: { identifier: string; name: string }
  ) => {
    // Check if this user already exists
    let studentUser = await UserModel.findOne({ identifier });
    if (!studentUser) {
      // Create new
      studentUser = await UserModel.create({
        identifier,
        name,
        enrolledCourses: [trialCourse._id],
        gitHandle: '',
      });
      // Also create the associated account
      await AccountModel.create({
        email: `${identifier}@example.com`,
        password: '$2b$10$UslurkMG9ujw5vqMWqvxheF4zLmWE78XZ9QAeEW637GiyLvXk3EG6',
        role: Role.Student,
        isApproved: true,
        wantsEmailNotifications: false,
        wantsTelegramNotifications: false,
        user: studentUser._id,
      });
    } else {
      // If already exists, ensure they're enrolled
      if (!studentUser.enrolledCourses.includes(trialCourse._id)) {
        studentUser.enrolledCourses.push(trialCourse._id);
        await studentUser.save();
      }
    }
    // Also ensure they're in the course's students array
    if (!trialCourse.students.includes(studentUser._id)) {
      trialCourse.students.push(studentUser._id);
      await trialCourse.save();
    }
    studentArray.push(studentUser._id.toString());
  };

  // Our "bogus" students
  await createAndEnrollStudent({ identifier: 'john-doe', name: 'John Doe' });
  await createAndEnrollStudent({ identifier: 'johnny-smith', name: 'Johnny Smith' });
  await createAndEnrollStudent({ identifier: 'hoshimachi-suisei', name: 'Hoshimachi Suisei' });

  // -----------------------------------------------------------------------------
  // 5) Create a TeamSet, Team, and TeamData with multiple example subdocuments
  // -----------------------------------------------------------------------------
  const teamSet = await TeamSetModel.create({
    course: trialCourse._id,
    name: 'Project Groups',
    teams: [], // will be filled below
  });
  trialCourse.teamSets.push(teamSet._id);
  await trialCourse.save();

  const team = await TeamModel.create({
    teamSet: teamSet._id,
    number: 100,
    members: studentArray,
    TA: trialUser._id, // We'll set the trial user as the TA for this team
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

    // Updated issues array
    updatedIssues: ['#12 Fix login bug', '#15 Update README', '#20 Minor UI improvements'],

    // Provide a map of each user’s contributions
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

    // Team PRs with subdocument reviews & comments
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

    // Example Milestones
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

  // Link the created TeamData to the Team
  team.teamData = teamData._id;
  await team.save();

  console.log('Trial data setup complete! All old trial data replaced with fresh data.');
};

export default setupTutorialDataJob;
