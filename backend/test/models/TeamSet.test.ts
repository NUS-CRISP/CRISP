import { CourseType } from '@shared/types/Course';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { ConnectOptions } from 'mongoose';
import CourseModel from '../../models/Course';
import TeamModel from '../../models/Team';
import TeamSetModel from '../../models/TeamSet';

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
  await TeamSetModel.deleteMany({});
  await CourseModel.deleteMany({});
  await TeamModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('TeamSetModel', () => {
  const testCourse = new CourseModel({
    name: 'Test Course',
    code: 'TEST1234',
    semester: 'Spring 2023',
    startDate: new Date('2024-08-15'),
    courseType: 'Normal' as CourseType,
  });
  testCourse.save();

  it('should create and save a new team set', async () => {
    const teamSetData: any = {
      course: testCourse,
      name: 'Team Set 1',
      teams: [],
    };

    const teamSet = new TeamSetModel(teamSetData);
    const savedTeamSet = await teamSet.save();

    expect(savedTeamSet.name).toEqual(teamSetData.name);
    expect(savedTeamSet.course._id.toString()).toEqual(
      testCourse._id.toString()
    );
  });

  it('should update an existing team set', async () => {
    const teamSet = new TeamSetModel({
      course: testCourse,
      name: 'Original Team Set',
      teams: [],
    });
    await teamSet.save();

    const updatedData = { name: 'Updated Team Set' };
    const updatedTeamSet = await TeamSetModel.findByIdAndUpdate(
      teamSet._id,
      updatedData,
      { new: true }
    );

    expect(updatedTeamSet?.name).toEqual(updatedData.name);
  });

  it('should delete a team set', async () => {
    const teamSetToDelete = new TeamSetModel({
      course: testCourse,
      name: 'Team Set to Delete',
    });
    await teamSetToDelete.save();

    await TeamSetModel.deleteOne({ _id: teamSetToDelete._id });
    const deletedTeamSet = await TeamSetModel.findById(teamSetToDelete._id);

    expect(deletedTeamSet).toBeNull();
  });

  it('should not save a team set without required fields', async () => {
    const teamSet = new TeamSetModel({ name: 'Incomplete Team Set' });
    await expect(teamSet.save()).rejects.toThrow();
  });

  it('should add teams to a team set', async () => {
    const teamSet = new TeamSetModel({
      course: testCourse,
      name: 'Team Set with Teams',
    });
    await teamSet.save();

    const team1 = new TeamModel({ number: 1, teamSet: teamSet._id });
    const team2 = new TeamModel({ number: 2, teamSet: teamSet._id });
    await Promise.all([team1.save(), team2.save()]);

    teamSet.teams.push(team1._id, team2._id);
    const updatedTeamSet = await teamSet.save();

    expect(updatedTeamSet.teams).toHaveLength(2);
    expect(updatedTeamSet.teams).toEqual(
      expect.arrayContaining([team1._id, team2._id])
    );
  });
});
