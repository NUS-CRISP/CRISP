import AccountModel from '@models/Account';
import CourseModel from '@models/Course';
import TeamDataModel from '@models/TeamData';
import UserModel from '@models/User';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { GitHubError, NotFoundError } from '../../services/errors';
import * as gitHubService from '../../services/githubService';
import * as gitHub from '../../utils/github';

jest.mock('../../utils/github');

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const mongoUri = await mongo.getUri();
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

describe('gitHubService', () => {
  let mockFacultyCourseId: string;
  let mockFacultyAccountId: string;

  beforeEach(async () => {
    await UserModel.deleteMany({});
    await AccountModel.deleteMany({});
    await CourseModel.deleteMany({});
    await TeamDataModel.deleteMany({});

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

    const teamData1 = new TeamDataModel({
      repoName: 'team1',
      gitHubOrgName: 'org',
      courseId: mockFacultyCourseId,
      teamContributions: [],
      pullRequests: 0,
      issues: 0,
      commits: 0,
      teamId: 0,
    });
    const teamData2 = new TeamDataModel({
      repoName: 'team2',
      gitHubOrgName: 'org',
      courseId: mockFacultyCourseId,
      teamContributions: [],
      pullRequests: 0,
      issues: 0,
      commits: 0,
      teamId: 1,
    });
    teamData1.save();
    teamData2.save();
  });

  describe('fetchAllTeamData', () => {
    it('should fetch all team data', async () => {
      const result = await gitHubService.fetchAllTeamData();

      console.log(result);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ repoName: 'team1' }),
          expect.objectContaining({ repoName: 'team2' }),
        ])
      );
    });
  });

  describe('fetchAllTeamDataForOrg', () => {
    it('should throw NotFoundError if no team data found for org', async () => {
      await expect(
        gitHubService.fetchAllTeamDataForOrg('nonexistentOrg')
      ).rejects.toThrow(NotFoundError);
    });

    it('should return team datas for a given org', async () => {
      const result = await gitHubService.fetchAllTeamDataForOrg('org');

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ repoName: 'team1' }),
          expect.objectContaining({ repoName: 'team2' }),
        ])
      );
    });
  });

  describe('checkGitHubInstallation', () => {
    it('should throw NotFoundError if GitHub App is not installed', async () => {
      jest.spyOn(gitHub, 'getGitHubApp').mockReturnValueOnce({
        octokit: {
          rest: {
            apps: {
              getOrgInstallation: jest
                .fn()
                .mockRejectedValueOnce(
                  new GitHubError('RequestError', 'Not Found')
                ) as any,
            },
          },
        },
      } as any);

      await expect(
        gitHubService.checkGitHubInstallation('nonexistentOrg')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error if error is not RequestError', async () => {
      const mockError = new Error('Some other error');

      jest.spyOn(gitHub, 'getGitHubApp').mockReturnValueOnce({
        octokit: {
          rest: {
            apps: {
              getOrgInstallation: jest
                .fn()
                .mockRejectedValueOnce(mockError) as any,
            },
          },
        },
      } as any);

      await expect(
        gitHubService.checkGitHubInstallation('existentOrg')
      ).rejects.toThrow(mockError);
    });

    it('should throw error if error is not an instance of Error', async () => {
      const mockError: any = { name: 'RequestError', message: 'Not Found' };

      jest.spyOn(gitHub, 'getGitHubApp').mockReturnValueOnce({
        octokit: {
          rest: {
            apps: {
              getOrgInstallation: jest
                .fn()
                .mockRejectedValueOnce(mockError) as any,
            },
          },
        },
      } as any);

      await expect(
        gitHubService.checkGitHubInstallation('existentOrg')
      ).rejects.toThrow('Unknown error checking GitHub installation.');
    });

    it('should return installation id if GitHub App is installed', async () => {
      const mockResponse = { data: { id: 12345 } };

      jest.spyOn(gitHub, 'getGitHubApp').mockReturnValue({
        octokit: {
          rest: {
            apps: {
              getOrgInstallation: jest.fn().mockResolvedValueOnce(mockResponse),
            },
          },
        },
      } as any);

      const result = await gitHubService.checkGitHubInstallation('existentOrg');

      expect(result).toEqual(12345);
    });
  });

  describe('getAuthorizedTeamDataByCourse', () => {
    it('should throw NotFoundError if account not found', async () => {
      await expect(
        gitHubService.getAuthorizedTeamDataByCourse(
          new mongoose.Types.ObjectId().toString(),
          mockFacultyCourseId
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if course not found', async () => {
      await expect(
        gitHubService.getAuthorizedTeamDataByCourse(
          mockFacultyAccountId,
          new mongoose.Types.ObjectId().toString()
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if faculty member is not authorized to view team data', async () => {
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
        gitHubService.getAuthorizedTeamDataByCourse(
          unauthorizedFacultyAccount._id,
          mockFacultyCourseId
        )
      ).rejects.toThrow(NotFoundError);

      await unauthorizedFacultyUser.deleteOne();
      await unauthorizedFacultyAccount.deleteOne();
    });
  });

  describe('getAuthorizedTeamDataNamesByCourse', () => {
    it('should return team data names', async () => {
      const result = await gitHubService.getAuthorizedTeamDataNamesByCourse(
        mockFacultyAccountId,
        mockFacultyCourseId
      );

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ repoName: 'team1' }),
          expect.objectContaining({ repoName: 'team2' }),
        ])
      );
    });
  });
});
