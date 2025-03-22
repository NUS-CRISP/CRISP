import AccountModel from '@models/Account';
import codeAnalysisDataModel from '@models/CodeAnalysisData';
import CourseModel from '@models/Course';
import UserModel from '@models/User';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import * as codeAnalysisService from '../../services/codeAnalysisService';
import { NotFoundError } from '../../services/errors';
import TeamModel from '@models/Team';
import TeamSetModel from '@models/TeamSet';
import TeamDataModel from '@models/TeamData';
import CrispRole from '@shared/types/auth/CrispRole';
import CourseRole from '@shared/types/auth/CourseRole';

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
  let mockFacultyUserId: string;
  let mockTAAccountId: string;
  let mockTAUserId: string;

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
      crispRole: CrispRole.Faculty,
      user: mockFacultyUser._id,
      isApproved: true,
    });
    await mockFacultyAccount.save();

    const mockTAUser = new UserModel({
      identifier: 'testTA',
      name: 'Test TA',
      enrolledCourses: [],
      gitHandle: 'testTA',
    });
    await mockTAUser.save();
    const mockTAAccount = new AccountModel({
      email: 'mockTA@example.com',
      password: 'hashedpassword',
      crispRole: CrispRole.Normal,
      user: mockTAUser._id,
      isApproved: true,
    });
    await mockTAAccount.save();

    const mockCourse = new CourseModel({
      name: 'testCourse',
      code: 'testCourse',
      semester: 'testCourse',
      startDate: new Date(),
      faculty: [mockFacultyUser._id],
      TAs: [mockTAUser._id],
      students: [],
      teamSets: [],
      courseType: 'GitHubOrg',
      gitHubOrgName: 'org',
      repoNameFilter: '',
      installationId: 12345,
    });
    await mockCourse.save();
    mockTAAccount.courseRoles.push({
      course: mockCourse._id.toString(),
      courseRole: CourseRole.TA
    });
    await mockTAAccount.save();
    mockFacultyAccount.courseRoles.push({
      course: mockCourse._id.toString(),
      courseRole: CourseRole.Faculty
    });
    await mockFacultyAccount.save();

    mockFacultyAccountId = mockFacultyAccount._id.toString();
    mockFacultyUserId = mockFacultyUser._id.toString();
    mockFacultyCourseId = mockCourse._id.toString();
    mockTAAccountId = mockTAAccount._id.toString();
    mockTAUserId = mockTAUser._id.toString();

    const team1 = new TeamModel({
      members: [],
      number: 1,
      TA: mockTAUser._id,
    });
    await team1.save();

    const team2 = new TeamModel({
      members: [],
      number: 2,
    });
    await team2.save();

    const mockTeamSet = new TeamSetModel({
      course: mockFacultyCourseId,
      name: 'test',
      teams: [team1._id, team2._id],
    });
    await mockTeamSet.save();

    mockCourse.teamSets = [mockTeamSet._id];
    await mockCourse.save();

    team1.teamSet = mockTeamSet._id;
    await team1.save();

    team2.teamSet = mockTeamSet._id;
    await team2.save();

    const teamData1 = new TeamDataModel({
      teamId: 1,
      gitHubOrgName: 'org',
      course: mockCourse._id,
      repoName: 'team1',
      teamContributions: {},
      teamPRs: [],
      updatedIssues: [],
      weeklyCommits: [],
      commits: 0,
      issues: 0,
      milestones: [],
      pullRequests: 0,
    });
    await teamData1.save();

    const teamData2 = new TeamDataModel({
      teamId: 2,
      gitHubOrgName: 'org',
      course: mockCourse._id,
      repoName: 'team2',
      teamContributions: {},
      teamPRs: [],
      updatedIssues: [],
      weeklyCommits: [],
      commits: 0,
      issues: 0,
      milestones: [],
      pullRequests: 0,
    });
    await teamData2.save();

    team1.teamData = teamData1._id;
    await team1.save();
    team2.teamData = teamData2._id;
    await team2.save();

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

    it('should throw NotFoundError if course GitHub organization not found for faculty member', async () => {
      const courseWithoutOrg = new CourseModel({
        name: 'testCourse',
        code: 'testCourse',
        semester: 'testCourse',
        startDate: new Date(),
        faculty: [mockFacultyUserId],
        TAs: [],
        students: [],
        teamSets: [],
        courseType: 'GitHubOrg',
        gitHubOrgName: '',
        repoNameFilter: '',
        installationId: 12345,
      });
      await courseWithoutOrg.save();

      await expect(
        codeAnalysisService.getAuthorizedCodeAnalysisDataByCourse(
          mockFacultyAccountId,
          courseWithoutOrg._id.toString()
        )
      ).rejects.toThrow(NotFoundError);

      await courseWithoutOrg.deleteOne();
    });

    it('should throw NotFoundError if course GitHub organization not found for admin member', async () => {
      const adminUser = new UserModel({
        identifier: 'testAdmin',
        name: 'Test Admin',
        enrolledCourses: [],
        gitHandle: 'testAdmin',
      });
      const adminAccount = new AccountModel({
        email: 'test1@example.com',
        password: 'hashedpassword',
        crispRole: CrispRole.Admin,
        user: adminUser._id,
        isApproved: true,
      });
      await adminUser.save();
      await adminAccount.save();

      const courseWithoutOrg = new CourseModel({
        name: 'testCourse',
        code: 'testCourse',
        semester: 'testCourse',
        startDate: new Date(),
        faculty: [adminUser._id],
        TAs: [],
        students: [],
        teamSets: [],
        courseType: 'GitHubOrg',
        gitHubOrgName: '',
        repoNameFilter: '',
        installationId: 12345,
      });
      await courseWithoutOrg.save();

      await expect(
        codeAnalysisService.getAuthorizedCodeAnalysisDataByCourse(
          adminAccount._id,
          courseWithoutOrg._id.toString()
        )
      ).rejects.toThrow(NotFoundError);

      await courseWithoutOrg.deleteOne();
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
        crispRole: CrispRole.Faculty,
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

    it('should return sorted code analysis data for faculty member', async () => {
      const result =
        await codeAnalysisService.getAuthorizedCodeAnalysisDataByCourse(
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

    it('should throw NotFoundError if no code analysis data found', async () => {
      const courseWithoutData = new CourseModel({
        name: 'testCourse',
        code: 'testCourse',
        semester: 'testCourse',
        startDate: new Date(),
        faculty: [mockFacultyUserId],
        TAs: [],
        students: [],
        teamSets: [],
        courseType: 'GitHubOrg',
        gitHubOrgName: 'NoDataOrg',
        repoNameFilter: '',
        installationId: 12345,
      });
      await courseWithoutData.save();

      await expect(
        codeAnalysisService.getAuthorizedCodeAnalysisDataByCourse(
          mockFacultyAccountId,
          courseWithoutData._id.toString()
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should return code analysis data for TA', async () => {
      const result =
        await codeAnalysisService.getAuthorizedCodeAnalysisDataByCourse(
          mockTAAccountId,
          mockFacultyCourseId
        );

      expect(result).toEqual(
        expect.arrayContaining([expect.objectContaining({ repoName: 'team1' })])
      );
    });

    it('should throw NotFoundError if no team sets found for course', async () => {
      const courseWithoutTeamSets = new CourseModel({
        name: 'testCourse',
        code: 'testCourse',
        semester: 'testCourse',
        startDate: new Date(),
        faculty: [mockFacultyUserId],
        TAs: [mockTAUserId],
        students: [],
        courseType: 'GitHubOrg',
        gitHubOrgName: 'NoTeamSetsOrg',
        repoNameFilter: '',
        installationId: 12345,
      });
      await courseWithoutTeamSets.save();
      const mockTAAccount = await AccountModel.findById(mockTAAccountId);
      mockTAAccount!.courseRoles.push({
        course: courseWithoutTeamSets._id.toString(),
        courseRole: CourseRole.TA,
      })
      await mockTAAccount!.save();
      const mockFacultyAccount = await AccountModel.findById(mockFacultyAccountId);
      mockFacultyAccount!.courseRoles.push({
        course: courseWithoutTeamSets._id.toString(),
        courseRole: CourseRole.Faculty,
      })
      await mockFacultyAccount!.save();

      await expect(
        codeAnalysisService.getAuthorizedCodeAnalysisDataByCourse(
          mockTAAccountId,
          courseWithoutTeamSets._id.toString()
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if no teams found for course', async () => {
      const courseWithoutTeams = new CourseModel({
        name: 'testCourse',
        code: 'testCourse',
        semester: 'testCourse',
        startDate: new Date(),
        faculty: [mockFacultyUserId],
        TAs: [mockTAUserId],
        students: [],
        courseType: 'GitHubOrg',
        gitHubOrgName: 'NoTeamsOrg',
        repoNameFilter: '',
        installationId: 12345,
      });
      await courseWithoutTeams.save();
      const mockTAAccount = await AccountModel.findById(mockTAAccountId);
      mockTAAccount!.courseRoles.push({
        course: courseWithoutTeams._id.toString(),
        courseRole: CourseRole.TA,
      })
      await mockTAAccount!.save();
      const mockFacultyAccount = await AccountModel.findById(mockFacultyAccountId);
      mockFacultyAccount!.courseRoles.push({
        course: courseWithoutTeams._id.toString(),
        courseRole: CourseRole.Faculty,
      })
      await mockFacultyAccount!.save();

      const teamSet = new TeamSetModel({
        course: courseWithoutTeams._id,
        name: 'test',
        teams: [],
      });
      await teamSet.save();

      courseWithoutTeams.teamSets = [teamSet._id];
      await courseWithoutTeams.save();

      await expect(
        codeAnalysisService.getAuthorizedCodeAnalysisDataByCourse(
          mockTAAccountId,
          courseWithoutTeams._id.toString()
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if no code analysis data found for course', async () => {
      const courseWithoutCodeAnalysisData = new CourseModel({
        name: 'testCourse',
        code: 'testCourse',
        semester: 'testCourse',
        startDate: new Date(),
        faculty: [mockFacultyUserId],
        TAs: [mockTAUserId],
        students: [],
        courseType: 'GitHubOrg',
        gitHubOrgName: 'NoCodeAnalysisDataOrg',
        repoNameFilter: '',
        installationId: 345,
      });
      await courseWithoutCodeAnalysisData.save();
      const mockTAAccount = await AccountModel.findById(mockTAAccountId);
      mockTAAccount!.courseRoles.push({
        course: courseWithoutCodeAnalysisData._id.toString(),
        courseRole: CourseRole.TA,
      })
      await mockTAAccount!.save();
      const mockFacultyAccount = await AccountModel.findById(mockFacultyAccountId);
      mockFacultyAccount!.courseRoles.push({
        course: courseWithoutCodeAnalysisData._id.toString(),
        courseRole: CourseRole.Faculty,
      })
      await mockFacultyAccount!.save();

      const teamDataA = new TeamDataModel({
        teamId: 123,
        gitHubOrgName: 'NoCodeAnalysisDataOrg',
        course: courseWithoutCodeAnalysisData._id,
        repoName: 'teamA',
        teamContributions: {},
        teamPRs: [],
        updatedIssues: [],
        weeklyCommits: [],
        commits: 0,
        issues: 0,
        milestones: [],
        pullRequests: 0,
      });
      await teamDataA.save();

      const teamA = new TeamModel({
        members: [],
        number: 1,
        TA: mockTAUserId,
        teamData: teamDataA._id,
      });
      await teamA.save();

      const teamSetNoData = new TeamSetModel({
        course: courseWithoutCodeAnalysisData._id,
        name: 'test',
        teams: [teamA._id],
      });
      await teamSetNoData.save();

      teamA.teamSet = teamSetNoData._id;
      await teamA.save();

      courseWithoutCodeAnalysisData.teamSets = [teamSetNoData._id];
      await courseWithoutCodeAnalysisData.save();

      await expect(
        codeAnalysisService.getAuthorizedCodeAnalysisDataByCourse(
          mockTAAccountId,
          courseWithoutCodeAnalysisData._id.toString()
        )
      ).rejects.toThrow(
        new NotFoundError('No code analysis data found for course')
      );
    });
  });
});
