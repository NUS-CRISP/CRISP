import mongoose, { ConnectOptions } from 'mongoose';
import TeamSetModel, { TeamSet } from '../../models/TeamSet';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as ConnectOptions);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('TeamSetModel', () => {
  it('should create and save a new team set', async () => {
    const teamSetData: TeamSet = {
      course: new mongoose.Types.ObjectId(),
      name: 'Team Set 1',
      teams: [],
    };

    const teamSet = new TeamSetModel(teamSetData);

    const savedTeamSet = await teamSet.save();

    expect(savedTeamSet.course).toEqual(teamSetData.course);
    expect(savedTeamSet.name).toEqual(teamSetData.name);
    expect(savedTeamSet.teams).toEqual(teamSetData.teams);
  });

  it('should not save a team set without required fields', async () => {
    const teamSetData = {
      teams: [],
    };

    const teamSet = new TeamSetModel(teamSetData);

    await expect(teamSet.save()).rejects.toThrow();
  });

});
