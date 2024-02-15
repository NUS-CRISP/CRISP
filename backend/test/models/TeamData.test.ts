import mongoose, { ConnectOptions } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import TeamDataModel from '../../models/TeamData';

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
  await TeamDataModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('TeamDataModel', () => {
  it('should create and save new team data', async () => {
    const teamData: any = {
      teamId: 1,
      gitHubOrgName: 'TestOrg',
      repoName: 'TestRepo',
      commits: 10,
      issues: 5,
      stars: 3,
      forks: 2,
      pullRequests: 4,
      updatedIssues: ['Issue1', 'Issue2'],
      teamContributions: new Map([
        [
          'user1',
          new Map([
            ['commits', 5],
            ['issues', 2],
          ]),
        ],
      ]),
    };

    const newTeamData = new TeamDataModel(teamData);
    const savedTeamData = await newTeamData.save();

    expect(savedTeamData.gitHubOrgName).toEqual(teamData.gitHubOrgName);
    expect(savedTeamData.repoName).toEqual(teamData.repoName);
    expect(savedTeamData.commits).toEqual(teamData.commits);
  });

  it('should update existing team data', async () => {
    const originalData = new TeamDataModel({
      teamId: 1,
      gitHubOrgName: 'TestOrg',
      repoName: 'TestRepo',
      commits: 10,
      issues: 5,
      stars: 3,
      forks: 2,
      pullRequests: 4,
      updatedIssues: ['Issue1', 'Issue2'],
      teamContributions: new Map([
        [
          'user1',
          new Map([
            ['commits', 5],
            ['issues', 2],
          ]),
        ],
      ]),
    });
    await originalData.save();

    const update = { repoName: 'UpdatedRepo' };
    const updatedData = await TeamDataModel.findByIdAndUpdate(
      originalData._id,
      update,
      { new: true }
    );

    expect(updatedData?.repoName).toEqual(update.repoName);
  });

  it('should delete existing team data', async () => {
    const teamData = new TeamDataModel({
      teamId: 1,
      gitHubOrgName: 'TestOrg',
      repoName: 'TestRepo',
      commits: 10,
      issues: 5,
      stars: 3,
      forks: 2,
      pullRequests: 4,
      updatedIssues: ['Issue1', 'Issue2'],
      teamContributions: new Map([
        [
          'user1',
          new Map([
            ['commits', 5],
            ['issues', 2],
          ]),
        ],
      ]),
    });
    await teamData.save();

    await TeamDataModel.deleteOne({ _id: teamData._id });
    const deletedData = await TeamDataModel.findById(teamData._id);

    expect(deletedData).toBeNull();
  });

  it('should not save team data without required fields', async () => {
    const incompleteData = new TeamDataModel({
      teamId: 4,
    });

    await expect(incompleteData.save()).rejects.toThrow();
  });
});
