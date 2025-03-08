import AccountModel from '@models/Account';
import codeAnalysisDataModel from '@models/CodeAnalysisData';
import CourseModel from '@models/Course';
import {
  JiraBoardModel,
  JiraIssueModel,
  JiraSprintModel,
} from '@models/JiraData';
import TeamModel from '@models/Team';
import TeamDataModel from '@models/TeamData';
import TeamSetModel from '@models/TeamSet';
import UserModel from '@models/User';
import Role from '@shared/types/auth/Role';
import { JiraBoard } from '@shared/types/JiraData';

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

  // -----------------------------------------------------------------------------
  // 6) Create JiraIssues, JiraSprints and JiraBoard
  // -----------------------------------------------------------------------------
  const issue1 = {
    self: 'trial_jira_issue1',
    id: 'trial_jira_issue1',
    key: 'Trial Planning Sprint1',
    fields: {
      summary: 'Implement API for Sprint 1',
      resolution: {
        name: 'Done',
      },
      issuetype: {
        name: 'story',
        subtask: false,
      },
      status: {
        name: 'Done',
      },
      assignee: {
        displayName: 'John Doe',
      },
    },
    storyPoints: 3,
  };
  const issue2 = {
    self: 'trial_jira_issue2',
    id: 'trial_jira_issue2',
    key: 'Trial Planning Sprint1',
    fields: {
      summary: 'Implement SPA',
      resolution: {
        name: 'Done',
      },
      issuetype: {
        name: 'story',
        subtask: false,
      },
      status: {
        name: 'Done',
      },
      assignee: {
        displayName: 'Johnny Smith',
      },
    },
    storyPoints: 2,
  };
  const issue3 = {
    self: 'trial_jira_issue3',
    id: 'trial_jira_issue3',
    key: 'Trial Planning Sprint2',
    fields: {
      summary: 'SetUp MongoDB',
      resolution: {
        name: 'Done',
      },
      issuetype: {
        name: 'story',
        subtask: false,
      },
      status: {
        name: 'Done',
      },
      assignee: {
        displayName: 'Hoshimachi Suisei',
      },
    },
    storyPoints: 1,
  };
  const issue4 = {
    self: 'trial_jira_issue4',
    id: 'trial_jira_issue4',
    key: 'Trial Planning Sprint2',
    fields: {
      summary: 'Implement API for Sprint 2',
      resolution: {
        name: 'To Do',
      },
      issuetype: {
        name: 'story',
        subtask: false,
      },
      status: {
        name: 'To Do',
      },
      assignee: {
        displayName: 'John Doe',
      },
    },
    storyPoints: 3,
  };
  const issue5 = {
    self: 'trial_jira_issue5',
    id: 'trial_jira_issue5',
    key: 'Trial Planning Sprint2',
    fields: {
      summary: 'Implement landing and hero page',
      resolution: {
        name: 'In progress',
      },
      issuetype: {
        name: 'story',
        subtask: false,
      },
      status: {
        name: 'In progress',
      },
      assignee: {
        displayName: 'Johnny Smith',
      },
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
    columns: [
      {
        name: 'To Do',
      },
      {
        name: 'In progress',
      },
      {
        name: 'Done',
      },
    ],
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

  // -----------------------------------------------------------------------------
  // 7) Create code analysis data
  // -----------------------------------------------------------------------------
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
    ],
    domains = [
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
    ];
  const codeAnalysisData = [
    {
      executionTime: new Date('2024-11-01T00:00:00Z'),
      gitHubOrgName: trialCourse.gitHubOrgName,
      repoName: teamData.repoName,
      teamId: teamData.teamId,
      metrics: metrics,
      types: types,
      domains: domains,
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
      ],
      metricStats: {
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
      metrics: metrics,
      types: types,
      domains: domains,
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
      ],
      metricStats: {
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
    },
    {
      executionTime: new Date('2024-11-03T00:00:00Z'),
      gitHubOrgName: trialCourse.gitHubOrgName,
      repoName: teamData.repoName,
      teamId: teamData.teamId,
      metrics: metrics,
      types: types,
      domains: domains,
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
      ],
      metricStats: {
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
    },
    {
      executionTime: new Date('2024-11-04T00:00:00Z'),
      gitHubOrgName: trialCourse.gitHubOrgName,
      repoName: teamData.repoName,
      teamId: teamData.teamId,
      metrics: metrics,
      types: types,
      domains: domains,
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
        '302.47'
      ],
      metricStats: {
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
    },
    {
      executionTime: new Date('2024-11-05T00:00:00Z'),
      gitHubOrgName: trialCourse.gitHubOrgName,
      repoName: teamData.repoName,
      teamId: teamData.teamId,
      metrics: metrics,
      types: types,
      domains: domains,
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
        '294.59'
      ],
      metricStats: {
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
    },
  ];

  for (const data of codeAnalysisData) {
    await codeAnalysisDataModel.create(data);
  }

  console.log(
    'Trial data setup complete! All old trial data replaced with fresh data.'
  );
};

export default setupTutorialDataJob;
