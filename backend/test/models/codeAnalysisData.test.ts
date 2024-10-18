import codeAnalysisDataModel from '@models/CodeAnalysisData';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { ConnectOptions } from 'mongoose';

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
    await codeAnalysisDataModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('CodeAnalysisDataModel', () => {
  it('should create and save a new codeAnalysisData', async () => {
    const codeAnalysisData = new codeAnalysisDataModel({
      executionTime: new Date(),
      gitHubOrgName: 'testOrg',
      teamId: 1,
      repoName: 'testRepo',
      metrics: ['testMetric'],
      values: ['testValue'],
      types: ['testType'],
      domains: ['testDomain'],
    });
    const savedCodeAnalysisData = await codeAnalysisData.save();

    expect(savedCodeAnalysisData._id).toBeDefined();
    expect(savedCodeAnalysisData.executionTime).toBeInstanceOf(Date);
    expect(savedCodeAnalysisData.gitHubOrgName).toBe('testOrg');
    expect(savedCodeAnalysisData.teamId).toBe(1);
    expect(savedCodeAnalysisData.repoName).toBe('testRepo');
    expect(savedCodeAnalysisData.metrics).toEqual(['testMetric']);
    expect(savedCodeAnalysisData.values).toEqual(['testValue']);
    expect(savedCodeAnalysisData.types).toEqual(['testType']);
    expect(savedCodeAnalysisData.domains).toEqual(['testDomain']);
  });

  it('should fail to save a codeAnalysisData with missing required fields', async () => {
    const codeAnalysisData = new codeAnalysisDataModel({
      gitHubOrgName: 'testOrg',
      teamId: 1,
      repoName: 'testRepo',
      metrics: ['testMetric'],
      values: ['testValue'],
      types: ['testType'],
      domains: ['testDomain'],
    });

    await expect(codeAnalysisData.save()).rejects.toThrow();
  });
});
