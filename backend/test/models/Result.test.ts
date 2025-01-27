import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ResultModel from '../../models/Result';
import AssessmentModel from '../../models/Assessment';
import UserModel from '../../models/User';
import TeamModel from '../../models/Team';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

beforeEach(async () => {
  await ResultModel.deleteMany({});
  await AssessmentModel.deleteMany({});
  await UserModel.deleteMany({});
  await TeamModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('ResultModel', () => {
  it('should create and save a new result', async () => {
    const assessment = new AssessmentModel({
      assessmentType: 'Quiz',
      course: new Types.ObjectId(),
      markType: 'Percentage',
      frequency: 'Weekly',
      granularity: 'individual',
    });
    await assessment.save();

    const team = new TeamModel({ number: 1 });
    await team.save();

    const marker = new UserModel({ name: 'Marker', identifier: 'M001' });
    await marker.save();

    const resultData: any = {
      _id: new Types.ObjectId().toString(),
      assessment: assessment._id,
      team: team._id,
      marker: marker._id,
      marks: [{ user: 'S001', name: 'Student One', mark: 80 }],
    };

    const result = new ResultModel(resultData);
    const savedResult = await result.save();

    expect(savedResult.assessment).toEqual(resultData.assessment);
    expect(savedResult.team).toEqual(resultData.team);
    expect(savedResult.marker).toEqual(resultData.marker);
    expect(savedResult.marks[0].mark).toEqual(resultData.marks[0].mark);
  });

  it('should update an existing result', async () => {
    const assessment = new AssessmentModel({
      assessmentType: 'Assignment',
      course: new Types.ObjectId(),
      markType: 'Percentage',
      frequency: 'Weekly',
      granularity: 'individual',
    });
    await assessment.save();

    const result = new ResultModel({
      assessment: assessment._id,
      marks: [{ user: 'S002', name: 'Student Two', mark: 70 }],
    });
    await result.save();

    const updatedResultData = {
      marks: [{ user: 'S002', name: 'Student Two', mark: 85 }],
    };
    const updatedResult = await ResultModel.findByIdAndUpdate(
      result._id,
      updatedResultData,
      { new: true }
    );

    expect(updatedResult?.marks[0].mark).toEqual(
      updatedResultData.marks[0].mark
    );
  });

  it('should delete an existing result', async () => {
    const assessment = new AssessmentModel({
      assessmentType: 'Test',
      course: new Types.ObjectId(),
      markType: 'Percentage',
      frequency: 'Weekly',
      granularity: 'individual',
    });
    await assessment.save();

    const result = new ResultModel({
      assessment: assessment._id,
      marks: [{ user: 'S003', name: 'Student Three', mark: 65 }],
    });
    await result.save();

    await ResultModel.deleteOne({ _id: result._id });
    const deletedResult = await ResultModel.findById(result._id);

    expect(deletedResult).toBeNull();
  });

  it('should not save a result without required fields', async () => {
    const resultData = {
      // Missing assessment and other required fields
      marks: [],
    };

    const result = new ResultModel(resultData);
    await expect(result.save()).rejects.toThrow();
  });

  it('should link a result to a team', async () => {
    const assessment = new AssessmentModel({
      assessmentType: 'Project',
      course: new Types.ObjectId(),
      markType: 'Percentage',
      frequency: 'Weekly',
      granularity: 'individual',
    });
    await assessment.save();

    const team = new TeamModel({ number: 2 });
    await team.save();

    const resultData: any = {
      assessment: assessment._id,
      team: team._id,
      marks: [{ user: 'S004', name: 'Student Four', mark: 90 }],
    };

    const result = new ResultModel(resultData);
    const savedResult = await result.save();

    expect(savedResult.team).toEqual(team._id);
  });
});
