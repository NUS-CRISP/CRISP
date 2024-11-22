import AccountModel from '@models/Account';
import codeAnalysisDataModel from '@models/CodeAnalysisData';
import CourseModel from '@models/Course';
import UserModel from '@models/User';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import * as codeAnalysisService from '../../services/codeAnalysisService';
import { NotFoundError } from '../../services/errors';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const mongoUri = mongo.getUri();
  await mongoose.connect(mongoUri);
});

beforeEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  if (mongo) {
    await mongo.stop();
  }
  await mongoose.connection.close();
});

describe('codeAnalysisService', () => {
  let mockFacultyCourseId: string;
  let mockFacultyAccountId: string;

  beforeEach(async () => {
    await UserModel.deleteMany({});
    await AccountModel.deleteMany({});
    await CourseModel.deleteMany({});
    await codeAnalysisDataModel.deleteMany({});

    const mockFacultyUser = new UserModel({
      identifier: 'test',
      name: 'Test User',
      enrolledCourses: [],
      gitHandle: 'test',
    });
    await mockFacultyUser.save();
    const mockFacultyAccount = new AccountModel({
      email: 'test@example.com',
      password: 'hashedpassword',
      role: 'Faculty member',
      user: mockFacultyUser._id,
      isApproved: true,
    });
    await mockFacultyAccount.save();
    const mockCourse = new CourseModel({
      name: 'testCourse',
      code: 'testCourse',
      semester: 'testCourse',
      startDate: new Date(),
      faculty: [mockFacultyUser._id],
      TAs: [],
      students: [],
      teamSets: [],
      courseType: 'GitHubOrg',
      gitHubOrgName: 'org',
      repoNameFilter: '',
      installationId: 12345,
    });
    await mockCourse.save();

    mockFacultyAccountId = mockFacultyAccount._id.toString();
    mockFacultyCourseId = mockCourse._id.toString();

    const codeAnalysisData1 = new codeAnalysisDataModel({
      executionTime: new Date(),
      gitHubOrgName: 'org',
      teamId: 1,
      repoName: 'team1',
      metrics: ['testMetric'],
      values: ['testValue'],
      types: ['testType'],
      domains: ['testDomain'],
    });

    const codeAnalysisData2 = new codeAnalysisDataModel({
      executionTime: new Date(),
      gitHubOrgName: 'org',
      teamId: 2,
      repoName: 'team2',
      metrics: ['testMetric'],
      values: ['testValue'],
      types: ['testType'],
      domains: ['testDomain'],
    });

    await codeAnalysisData1.save();
    await codeAnalysisData2.save();
  });

  describe('fetchAllCodeAnalysisData', () => {
    it('should fetch all code analysis data', async () => {
      const result = await codeAnalysisService.fetchAllCodeAnalysisData();

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ repoName: 'team1' }),
          expect.objectContaining({ repoName: 'team2' }),
        ])
      );
    });
  });

  describe('fetchAllCodeAnalysisDataForOrg', () => {
    it('should throw NotFoundError if no code analysis data found for org', async () => {
      await expect(
        codeAnalysisService.fetchAllCodeAnalysisDataForOrg('nonexistentOrg')
      ).rejects.toThrow(NotFoundError);
    });

    it('should return code analysis datas for a given org', async () => {
      const result =
        await codeAnalysisService.fetchAllCodeAnalysisDataForOrg('org');

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ repoName: 'team1' }),
          expect.objectContaining({ repoName: 'team2' }),
        ])
      );
    });
  });

  describe('getAuthorizedCodeAnalysisDataByCourse', () => {
    it('should throw NotFoundError if account not found', async () => {
      await expect(
        codeAnalysisService.getAuthorizedCodeAnalysisDataByCourse(
          new mongoose.Types.ObjectId().toString(),
          mockFacultyCourseId
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if course not found', async () => {
      await expect(
        codeAnalysisService.getAuthorizedCodeAnalysisDataByCourse(
          mockFacultyAccountId,
          new mongoose.Types.ObjectId().toString()
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if faculty member is not authorized to view code analysis data', async () => {
      const unauthorizedFacultyUser = new UserModel({
        identifier: 'test1',
        name: 'Test User 1',
        enrolledCourses: [],
        gitHandle: 'test1',
      });
      const unauthorizedFacultyAccount = new AccountModel({
        email: 'test1@example.com',
        password: 'hashedpassword',
        role: 'Faculty member',
        user: unauthorizedFacultyUser._id,
        isApproved: true,
      });
      await unauthorizedFacultyUser.save();
      await unauthorizedFacultyAccount.save();

      await expect(
        codeAnalysisService.getAuthorizedCodeAnalysisDataByCourse(
          unauthorizedFacultyAccount._id,
          mockFacultyCourseId
        )
      ).rejects.toThrow(NotFoundError);

      await unauthorizedFacultyUser.deleteOne();
      await unauthorizedFacultyAccount.deleteOne();
    });
  });
});
