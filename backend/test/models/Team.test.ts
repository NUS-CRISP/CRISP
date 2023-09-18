import mongoose, { ConnectOptions } from 'mongoose';
import TeamModel, { Team } from '../../models/Team';
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

describe('TeamModel', () => {
  it('should create and save a new team', async () => {
    const teamData: Team = {
      teamSet: new mongoose.Types.ObjectId(),
      number: 1,
      members: [],
    };

    const team = new TeamModel(teamData);

    const savedTeam = await team.save();

    expect(savedTeam.teamSet).toEqual(teamData.teamSet);
    expect(savedTeam.number).toEqual(teamData.number);
    expect(savedTeam.members).toEqual(teamData.members);
  });

  it('should not save a team without required fields', async () => {
    const teamData = {
      members: [],
    };

    const team = new TeamModel(teamData);

    await expect(team.save()).rejects.toThrow();
  });

  it('should update an existing team', async () => {
    const existingTeam = new TeamModel({
      teamSet: new mongoose.Types.ObjectId(),
      number: 2,
      members: [],
    });

    await existingTeam.save();

    const updatedTeam = await TeamModel.findByIdAndUpdate(
      existingTeam._id,
      { number: 3 },
      { new: true }
    );

    expect(updatedTeam?.number).toEqual(3);
  });

  it('should delete an existing team', async () => {
    const teamToDelete = new TeamModel({
      teamSet: new mongoose.Types.ObjectId(),
      number: 4,
      members: [],
    });

    await teamToDelete.save();

    const deletedTeam = await TeamModel.findByIdAndDelete(teamToDelete._id);

    expect(deletedTeam?._id).toStrictEqual(teamToDelete._id);
  });
});
