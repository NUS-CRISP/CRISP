import { CourseType } from '@shared/types/Course';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { ConnectOptions } from 'mongoose';
import CourseModel from '../../models/Course';
import {
  JiraBoardModel,
  JiraIssueModel,
  JiraSprintModel,
} from '../../models/JiraData';
import TeamModel from '../../models/Team';
import TeamSetModel from '../../models/TeamSet';
import UserModel from '../../models/User';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as ConnectOptions);
});

beforeEach(async () => {
  await JiraIssueModel.deleteMany({});
  await JiraSprintModel.deleteMany({});
  await JiraBoardModel.deleteMany({});
  await TeamModel.deleteMany({});
  await TeamSetModel.deleteMany({});
  await UserModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('JiraDataModel', () => {
  const testCourse = new CourseModel({
    name: 'Test Course',
    code: 'TEST1234',
    semester: 'Spring 2023',
    startDate: new Date('2024-08-15'),
    courseType: 'Normal' as CourseType,
  });
  testCourse.save();

  const teamSet = new TeamSetModel({
    name: 'Team Set 1',
    course: testCourse._id,
  });
  teamSet.save();

  const TA = new UserModel({ name: 'TA One', identifier: 'TA001' });
  TA.save();

  const team = new TeamModel({
    teamSet: teamSet._id,
    number: 1,
    TA: TA._id,
    members: [],
  });
  team.save();

  const jiraIssueData = {
    id: 'ISSUE-1',
    self: 'Mock Issue URL',
    key: 'ISSUE-1',
    storyPoints: 5,
    fields: {
      summary: 'Mock Issue Summary',
      statuscategorychangedate: new Date(),
      issuetype: {
        name: 'Task',
        subtask: false,
      },
      status: {
        name: 'To Do',
      },
      assignee: {
        displayName: 'John Doe',
      },
      resolution: {
        name: 'Unresolved',
      },
    },
  };

  const jiraSprintData = {
    id: 1,
    self: 'Mock Sprint URL',
    state: 'active',
    name: 'Mock Sprint',
    startDate: new Date(),
    endDate: new Date(),
    createdDate: new Date(),
    originBoardId: 1,
    goal: 'Mock Sprint Goal',
    jiraIssues: [],
  };

  const jiraBoardData = {
    id: 1,
    self: 'Mock Board URL',
    name: 'Mock Board',
    type: 'Scrum',
    jiraLocation: {
      projectId: 1,
      displayName: 'Mock Project',
      projectName: 'Mock Project Name',
      projectKey: 'MPN',
      projectTypeKey: 'Software',
      avatarURI: 'Mock Avatar URL',
      name: 'Mock Location',
    },
    columns: [{ name: 'To Do' }],
    jiraSprints: [],
    jiraIssues: [],
    course: testCourse._id,
  };

  it('should create and save Jira datas', async () => {
    const mockIssue = new JiraIssueModel(jiraIssueData);

    const mockSprint = new JiraSprintModel({
      ...jiraSprintData,
      jiraIssues: [mockIssue._id],
    });

    const mockBoard = new JiraBoardModel({
      ...jiraBoardData,
      jiraSprints: [mockSprint._id],
      jiraIssues: [mockIssue._id],
    });

    const savedIssue = await mockIssue.save();
    const savedSprint = await mockSprint.save();
    const savedBoard = await mockBoard.save();

    expect(savedIssue).toEqual(mockIssue);
    expect(savedSprint).toEqual(mockSprint);
    expect(savedBoard).toEqual(mockBoard);
  });

  it('should update and save Jira datas', async () => {
    const mockIssue = new JiraIssueModel(jiraIssueData);

    const mockSprint = new JiraSprintModel({
      ...jiraSprintData,
      jiraIssues: [mockIssue._id],
    });

    const mockBoard = new JiraBoardModel({
      ...jiraBoardData,
      jiraSprints: [mockSprint._id],
      jiraIssues: [mockIssue._id],
    });

    await mockIssue.save();
    await mockSprint.save();
    await mockBoard.save();

    const updatedBoardData = {
      name: 'Updated Board Name',
    };

    const updatedBoard = await JiraBoardModel.findByIdAndUpdate(
      mockBoard._id,
      updatedBoardData,
      { new: true }
    );

    const updatedSprintData = {
      name: 'Updated Sprint Name',
    };

    const updatedSprint = await JiraSprintModel.findByIdAndUpdate(
      mockSprint._id,
      updatedSprintData,
      { new: true }
    );

    const updatedIssueSummary = 'Updated Summary';

    const updatedIssue = await JiraIssueModel.findByIdAndUpdate(
      mockIssue._id,
      {
        $set: {
          'fields.summary': updatedIssueSummary,
        },
      },
      { new: true }
    );

    expect(updatedBoard?.name).toEqual(updatedBoardData.name);
    expect(updatedSprint?.name).toEqual(updatedSprintData.name);
    expect(updatedIssue?.fields.summary).toEqual(updatedIssueSummary);
  });
});
