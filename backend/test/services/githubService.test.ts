import AccountModel from '@models/Account';
import CourseModel from '@models/Course';
import TeamModel from '@models/Team';
import TeamDataModel from '@models/TeamData';
import UserModel from '@models/User';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { GitHubError, NotFoundError } from '../../services/errors';
import * as gitHubService from '../../services/githubService';
import * as gitHub from '../../utils/github';
import { CRISP_ROLE } from '@shared/types/auth/CrispRole';
import { COURSE_ROLE } from '@shared/types/auth/CourseRole';
import TeamSetModel from '@models/TeamSet';

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
  let mockCourseWithoutTeamsId: string;
  let mockNormalAccountId: string;

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
      crispRole: CRISP_ROLE.Faculty,
      user: mockFacultyUser._id,
      isApproved: true,
    });
    await mockFacultyAccount.save();

    const normalUser = new UserModel({
      identifier: 'ta-test',
      name: 'TA Test User',
      enrolledCourses: [],
      gitHandle: 'ta-test',
    });
    await normalUser.save();

    const normalAccount = new AccountModel({
      email: 'ta-test@example.com',
      password: 'hashedpassword',
      crispRole: CRISP_ROLE.Normal,
      user: normalUser._id,
      isApproved: true,
    });
    await normalAccount.save();

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
    mockFacultyAccount.courseRoles.push({
      course: mockCourse._id.toString(),
      courseRole: COURSE_ROLE.Faculty,
    });
    await mockFacultyAccount.save();
    await mockCourse.save();

    const mockCourseWithoutTeams = new CourseModel({
      name: 'testCourseWithoutTeams',
      code: 'testCourseWithoutTeams',
      semester: 'testCourse',
      startDate: new Date(),
      faculty: [mockFacultyUser._id],
      TAs: [],
      students: [],
      teamSets: [],
      courseType: 'GitHubOrg',
      gitHubOrgName: 'org',
      repoNameFilter: '',
      installationId: 123456,
    });
    await mockCourseWithoutTeams.save();

    mockFacultyAccountId = mockFacultyAccount._id.toString();
    mockFacultyCourseId = mockCourse._id.toString();
    mockCourseWithoutTeamsId = mockCourseWithoutTeams._id.toString();
    mockNormalAccountId = normalAccount._id.toString();

    const teamData1 = new TeamDataModel({
      repoName: 'team1',
      gitHubOrgName: 'org',
      course: mockCourse._id,
      teamContributions: [],
      pullRequests: 0,
      issues: 0,
      commits: 0,
      teamId: 0,
    });
    const teamData2 = new TeamDataModel({
      repoName: 'team2',
      gitHubOrgName: 'org',
      course: mockCourse._id,
      teamContributions: [],
      pullRequests: 0,
      issues: 0,
      commits: 0,
      teamId: 1,
    });
    await teamData1.save();
    await teamData2.save();
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

    it('should throw NotFoundError if no github org or repo link', async () => {
      const mockFacultyUser = await UserModel.findOne({ identifier: 'test' });
      const courseWithoutGitHub = new CourseModel({
        name: 'testCourseNoGitHub',
        code: 'testCourseNoGitHub',
        semester: 'testCourseNoGitHub',
        startDate: new Date(),
        faculty: [mockFacultyUser!._id],
        TAs: [],
        students: [],
        teamSets: [],
        courseType: 'GitHubOrg',
        // No gitHubOrgName
        // No gitHubRepoLinks
        repoNameFilter: '',
      });
      await courseWithoutGitHub.save();

      await expect(
        gitHubService.getAuthorizedTeamDataByCourse(
          mockFacultyAccountId,
          courseWithoutGitHub._id.toString()
        )
      ).resolves.toEqual([]);

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
        crispRole: CRISP_ROLE.Faculty,
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

    it('should throw NotFoundError if no team sets found for course normal', async () => {
      await expect(
        gitHubService.getAuthorizedTeamDataByCourse(
          mockNormalAccountId,
          mockCourseWithoutTeamsId
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if Normal user has no teams as TA', async () => {
      const mockFacultyUser = await UserModel.findOne({ identifier: 'test' });

      // Create a course with team sets
      const courseWithTeamSets = new CourseModel({
        name: 'courseWithTeamSets',
        code: 'courseWithTeamSets',
        semester: 'testCourse',
        startDate: new Date(),
        faculty: [mockFacultyUser!._id],
        gitHubOrgName: 'org',
        courseType: 'GitHubOrg',
        repoNameFilter: '',
      });
      await courseWithTeamSets.save();

      // Create a team set for this course
      const teamSet = new TeamSetModel({
        name: 'Test Team Set',
        course: courseWithTeamSets._id,
      });
      await teamSet.save();

      // Normal user tries to access but has no teams assigned as TA
      await expect(
        gitHubService.getAuthorizedTeamDataByCourse(
          mockNormalAccountId,
          courseWithTeamSets._id.toString()
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if faculty course has no team data', async () => {
      const mockFacultyUser = await UserModel.findOne({ identifier: 'test' });

      const courseWithNoTeamData = await CourseModel.create({
        name: 'courseWithNoTeamData',
        code: 'courseWithNoTeamData',
        semester: 'testCourse',
        startDate: new Date(),
        faculty: [mockFacultyUser!._id],
        TAs: [],
        students: [],
        teamSets: [],
        courseType: 'GitHubOrg',
        gitHubOrgName: 'org',
        repoNameFilter: '',
      });

      await expect(
        gitHubService.getAuthorizedTeamDataByCourse(
          mockFacultyAccountId,
          courseWithNoTeamData._id.toString()
        )
      ).resolves.toEqual([]);
    });

    it('should return sorted team data for normal user with assigned teams', async () => {
      const normalAccount = await AccountModel.findById(mockNormalAccountId);
      const normalUserId = normalAccount!.user;

      const mockFacultyUser = await UserModel.findOne({ identifier: 'test' });
      const courseWithTeams = await CourseModel.create({
        name: 'courseWithTeamsForNormal',
        code: 'courseWithTeamsForNormal',
        semester: 'testCourse',
        startDate: new Date(),
        faculty: [mockFacultyUser!._id],
        TAs: [],
        students: [],
        teamSets: [],
        courseType: 'GitHubOrg',
        gitHubOrgName: 'org',
        repoNameFilter: '',
      });

      const teamSet = await TeamSetModel.create({
        name: 'Normal Team Set',
        course: courseWithTeams._id,
      });

      const zData = await TeamDataModel.create({
        repoName: 'zz-team',
        gitHubOrgName: 'org',
        course: courseWithTeams._id,
        teamContributions: [],
        pullRequests: 0,
        issues: 0,
        commits: 0,
        teamId: 10,
      });
      const aData = await TeamDataModel.create({
        repoName: 'aa-team',
        gitHubOrgName: 'org',
        course: courseWithTeams._id,
        teamContributions: [],
        pullRequests: 0,
        issues: 0,
        commits: 0,
        teamId: 11,
      });

      await TeamModel.create({
        teamSet: teamSet._id,
        number: 1,
        TA: normalUserId,
        members: [],
        teamData: zData._id,
      });
      await TeamModel.create({
        teamSet: teamSet._id,
        number: 2,
        TA: normalUserId,
        members: [],
        teamData: aData._id,
      });

      const result = await gitHubService.getAuthorizedTeamDataByCourse(
        mockNormalAccountId,
        courseWithTeams._id.toString()
      );

      expect(result).toBeDefined();
      expect(result!.map(team => team.repoName)).toEqual(['aa-team', 'zz-team']);
    });

    it('should handle equal repo names in faculty sorting comparator', async () => {
      const mockFacultyUser = await UserModel.findOne({ identifier: 'test' });

      const courseWithDuplicateRepoNames = await CourseModel.create({
        name: 'courseWithDuplicateRepoNames',
        code: 'courseWithDuplicateRepoNames',
        semester: 'testCourse',
        startDate: new Date(),
        faculty: [mockFacultyUser!._id],
        TAs: [],
        students: [],
        teamSets: [],
        courseType: 'GitHubOrg',
        gitHubOrgName: 'org',
        repoNameFilter: '',
      });

      await TeamDataModel.create({
        repoName: 'same-name',
        gitHubOrgName: 'org',
        course: courseWithDuplicateRepoNames._id,
        teamContributions: [],
        pullRequests: 0,
        issues: 0,
        commits: 0,
        teamId: 100,
      });
      await TeamDataModel.create({
        repoName: 'same-name',
        gitHubOrgName: 'org',
        course: courseWithDuplicateRepoNames._id,
        teamContributions: [],
        pullRequests: 0,
        issues: 0,
        commits: 0,
        teamId: 101,
      });

      const result = await gitHubService.getAuthorizedTeamDataByCourse(
        mockFacultyAccountId,
        courseWithDuplicateRepoNames._id.toString()
      );

      expect(result).toBeDefined();
      expect(result!).toHaveLength(2);
      expect(result![0].repoName).toBe('same-name');
      expect(result![1].repoName).toBe('same-name');
    });

    it('should exercise faculty sorting comparator less-than path', async () => {
      const mockFacultyUser = await UserModel.findOne({ identifier: 'test' });

      const courseWithSortableRepoNames = await CourseModel.create({
        name: 'courseWithSortableRepoNames',
        code: 'courseWithSortableRepoNames',
        semester: 'testCourse',
        startDate: new Date(),
        faculty: [mockFacultyUser!._id],
        TAs: [],
        students: [],
        teamSets: [],
        courseType: 'GitHubOrg',
        gitHubOrgName: 'org',
        repoNameFilter: '',
      });

      // Insert in reverse order so comparator hits the a < b branch during sorting
      await TeamDataModel.create({
        repoName: 'zz-faculty',
        gitHubOrgName: 'org',
        course: courseWithSortableRepoNames._id,
        teamContributions: [],
        pullRequests: 0,
        issues: 0,
        commits: 0,
        teamId: 200,
      });
      await TeamDataModel.create({
        repoName: 'aa-faculty',
        gitHubOrgName: 'org',
        course: courseWithSortableRepoNames._id,
        teamContributions: [],
        pullRequests: 0,
        issues: 0,
        commits: 0,
        teamId: 201,
      });

      const result = await gitHubService.getAuthorizedTeamDataByCourse(
        mockFacultyAccountId,
        courseWithSortableRepoNames._id.toString()
      );

      expect(result).toBeDefined();
      expect(result!.map(team => team.repoName)).toEqual([
        'aa-faculty',
        'zz-faculty',
      ]);
    });

    it('should exercise normal user sorting comparator greater-than path', async () => {
      const normalAccount = await AccountModel.findById(mockNormalAccountId);
      const normalUserId = normalAccount!.user;
      const mockFacultyUser = await UserModel.findOne({ identifier: 'test' });

      const courseWithTeams = await CourseModel.create({
        name: 'courseWithTeamsComparatorGt',
        code: 'courseWithTeamsComparatorGt',
        semester: 'testCourse',
        startDate: new Date(),
        faculty: [mockFacultyUser!._id],
        TAs: [],
        students: [],
        teamSets: [],
        courseType: 'GitHubOrg',
        gitHubOrgName: 'org',
        repoNameFilter: '',
      });

      const teamSet = await TeamSetModel.create({
        name: 'Comparator GT Team Set',
        course: courseWithTeams._id,
      });

      const aData = await TeamDataModel.create({
        repoName: 'aa-team',
        gitHubOrgName: 'org',
        course: courseWithTeams._id,
        teamContributions: [],
        pullRequests: 0,
        issues: 0,
        commits: 0,
        teamId: 20,
      });
      const zData = await TeamDataModel.create({
        repoName: 'zz-team',
        gitHubOrgName: 'org',
        course: courseWithTeams._id,
        teamContributions: [],
        pullRequests: 0,
        issues: 0,
        commits: 0,
        teamId: 21,
      });

      await TeamModel.create({
        teamSet: teamSet._id,
        number: 11,
        TA: normalUserId,
        members: [],
        teamData: aData._id,
      });
      await TeamModel.create({
        teamSet: teamSet._id,
        number: 12,
        TA: normalUserId,
        members: [],
        teamData: zData._id,
      });

      const result = await gitHubService.getAuthorizedTeamDataByCourse(
        mockNormalAccountId,
        courseWithTeams._id.toString()
      );

      expect(result).toBeDefined();
      expect(result!.map(team => team.repoName)).toEqual(['aa-team', 'zz-team']);
    });

    it('should handle equal repo names in normal user sorting comparator', async () => {
      const normalAccount = await AccountModel.findById(mockNormalAccountId);
      const normalUserId = normalAccount!.user;
      const mockFacultyUser = await UserModel.findOne({ identifier: 'test' });

      const courseWithTeams = await CourseModel.create({
        name: 'courseWithTeamsComparatorEq',
        code: 'courseWithTeamsComparatorEq',
        semester: 'testCourse',
        startDate: new Date(),
        faculty: [mockFacultyUser!._id],
        TAs: [],
        students: [],
        teamSets: [],
        courseType: 'GitHubOrg',
        gitHubOrgName: 'org',
        repoNameFilter: '',
      });

      const teamSet = await TeamSetModel.create({
        name: 'Comparator EQ Team Set',
        course: courseWithTeams._id,
      });

      const same1 = await TeamDataModel.create({
        repoName: 'same-normal',
        gitHubOrgName: 'org',
        course: courseWithTeams._id,
        teamContributions: [],
        pullRequests: 0,
        issues: 0,
        commits: 0,
        teamId: 30,
      });
      const same2 = await TeamDataModel.create({
        repoName: 'same-normal',
        gitHubOrgName: 'org',
        course: courseWithTeams._id,
        teamContributions: [],
        pullRequests: 0,
        issues: 0,
        commits: 0,
        teamId: 31,
      });

      await TeamModel.create({
        teamSet: teamSet._id,
        number: 21,
        TA: normalUserId,
        members: [],
        teamData: same1._id,
      });
      await TeamModel.create({
        teamSet: teamSet._id,
        number: 22,
        TA: normalUserId,
        members: [],
        teamData: same2._id,
      });

      const result = await gitHubService.getAuthorizedTeamDataByCourse(
        mockNormalAccountId,
        courseWithTeams._id.toString()
      );

      expect(result).toBeDefined();
      expect(result!).toHaveLength(2);
      expect(result![0].repoName).toBe('same-normal');
      expect(result![1].repoName).toBe('same-normal');
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

    it('should throw NotFoundError when team data is undefined', async () => {
      const mockFacultyUser = await UserModel.findOne({ identifier: 'test' });
      const weirdRoleUser = await UserModel.create({
        identifier: 'weird-role-user',
        name: 'Weird Role User',
      });
      const weirdRoleAccount = await AccountModel.create({
        email: 'weird-role@example.com',
        password: 'hashedpassword',
        crispRole: CRISP_ROLE.Normal,
        user: weirdRoleUser._id,
        isApproved: true,
      });

      // Bypass enum validation to hit the undefined-return branch in getAuthorizedTeamDataByCourse
      await AccountModel.updateOne(
        { _id: weirdRoleAccount._id },
        { $set: { crispRole: 'UnknownRole' } }
      );

      const validCourse = await CourseModel.create({
        name: 'validCourseForUndefinedTeamData',
        code: 'validCourseForUndefinedTeamData',
        semester: 'testCourse',
        startDate: new Date(),
        faculty: [mockFacultyUser!._id],
        TAs: [],
        students: [],
        teamSets: [],
        courseType: 'GitHubOrg',
        gitHubOrgName: 'org',
        repoNameFilter: '',
      });

      await expect(
        gitHubService.getAuthorizedTeamDataNamesByCourse(
          weirdRoleAccount._id.toString(),
          validCourse._id.toString()
        )
      ).rejects.toThrow('No team datas found for course');
    });
  });
});
