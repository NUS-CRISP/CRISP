import { CourseType } from '@shared/types/Course';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { ConnectOptions, Types } from 'mongoose';
import CourseModel from '../../models/Course';
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
  await TeamModel.deleteMany({});
  await TeamSetModel.deleteMany({});
  await UserModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('TeamModel', () => {
  const testCourse = new CourseModel({
    name: 'Test Course',
    code: 'TEST1234',
    semester: 'Spring 2023',
    startDate: new Date('2024-08-15'),
    courseType: 'Normal' as CourseType,
  });
  testCourse.save();

  it('should create and save a new team', async () => {
    const teamSet = new TeamSetModel({
      name: 'Team Set 1',
      course: testCourse,
    });
    await teamSet.save();

    const TA = new UserModel({ name: 'TA One', identifier: 'TA001' });
    await TA.save();

    const teamData: any = {
      teamSet: teamSet._id,
      number: 1,
      TA: TA._id,
      members: [],
    };

    const team = new TeamModel(teamData);
    const savedTeam = await team.save();

    expect(savedTeam.teamSet).toEqual(teamData.teamSet);
    expect(savedTeam.number).toEqual(teamData.number);
    expect(savedTeam.TA).toEqual(teamData.TA);
  });

  it('should update an existing team', async () => {
    const teamSet = new TeamSetModel({
      name: 'Team Set 2',
      course: testCourse,
    });
    await teamSet.save();

    const team = new TeamModel({
      teamSet: teamSet._id,
      number: 2,
    });
    await team.save();

    const updatedTeamData = { number: 3 };
    const updatedTeam = await TeamModel.findByIdAndUpdate(
      team._id,
      updatedTeamData,
      { new: true }
    );

    expect(updatedTeam?.number).toEqual(updatedTeamData.number);
  });

  it('should delete an existing team', async () => {
    const teamSet = new TeamSetModel({
      name: 'Team Set 3',
      course: testCourse,
    });
    await teamSet.save();

    const team = new TeamModel({
      teamSet: teamSet._id,
      number: 4,
    });
    await team.save();

    await TeamModel.deleteOne({ _id: team._id });
    const deletedTeam = await TeamModel.findById(team._id);

    expect(deletedTeam).toBeNull();
  });

  it('should not save a team without required fields', async () => {
    const teamData = {
      // Missing teamSet and number fields
      TA: new Types.ObjectId(),
      members: [],
    };

    const team = new TeamModel(teamData);
    await expect(team.save()).rejects.toThrow();
  });

  it('should add members to a team', async () => {
    const teamSet = new TeamSetModel({
      name: 'Team Set 4',
      course: testCourse,
    });
    await teamSet.save();

    const student1 = new UserModel({ name: 'Student One', identifier: 'S001' });
    const student2 = new UserModel({ name: 'Student Two', identifier: 'S002' });
    await Promise.all([student1.save(), student2.save()]);

    const teamData: any = {
      teamSet: teamSet._id,
      number: 5,
      members: [student1._id, student2._id],
    };

    const team = new TeamModel(teamData);
    const savedTeam = await team.save();

    expect(savedTeam.members).toEqual(
      expect.arrayContaining([student1._id, student2._id])
    );
  });
});
