import { CourseType } from '@shared/types/Course';
import { TeamSet } from '@shared/types/TeamSet';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { ConnectOptions, Types } from 'mongoose';
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

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('TeamSetModel', () => {
  it('should create and save a new team set', async () => {
    const teamSetData: TeamSet = {
      _id: new Types.ObjectId().toString(),
      course: {
        _id: new Types.ObjectId().toString(),
        name: 'Test Course',
        code: 'COURSE101',
        semester: 'Spring 2023',
        faculty: [],
        TAs: [],
        students: [],
        teamSets: [],
        sprints: [],
        milestones: [],
        assessments: [],
        courseType: 'Normal' as CourseType,
      },
      name: 'Test Team Set',
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
