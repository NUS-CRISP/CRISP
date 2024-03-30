import TeamDataModel from '@models/TeamData';
import { NotFoundError } from '../../services/errors';
import * as gitHubService from '../../services/githubService';
import * as gitHub from '../../utils/github';

jest.mock('@models/Account');
jest.mock('@models/Course');
jest.mock('@models/Team');
jest.mock('@models/TeamData');
jest.mock('@models/TeamSet');
jest.mock('../../utils/github');

describe('gitHubService', () => {
  describe('fetchAllTeamData', () => {
    it('should fetch all team data', async () => {
      const mockTeamData = [{ gitHubOrgName: 'org' }];
      TeamDataModel.find = jest.fn().mockResolvedValue(mockTeamData);

      const result = await gitHubService.fetchAllTeamData();

      expect(TeamDataModel.find).toHaveBeenCalled();
      expect(result).toEqual(mockTeamData);
    });
  });

  describe('fetchAllTeamDataForOrg', () => {
    it('should throw NotFoundError if no team data found for org', async () => {
      TeamDataModel.find = jest.fn().mockResolvedValue([]);

      await expect(gitHubService.fetchAllTeamDataForOrg('nonexistentOrg')).rejects.toThrow(NotFoundError);
    });

    it('should return team datas for a given org', async () => {
      const mockTeamData = [{ gitHubOrgName: 'org' }]; // Your team data objects
      TeamDataModel.find = jest.fn().mockResolvedValue(mockTeamData);

      const result = await gitHubService.fetchAllTeamDataForOrg('org');

      expect(TeamDataModel.find).toHaveBeenCalledWith({
        gitHubOrgName: 'org',
      });
      expect(result).toEqual(mockTeamData);
    });
  });

  describe('checkGitHubInstallation', () => {
    it('should throw NotFoundError if GitHub App is not installed', async () => {
      const mockError = new Error('Not Found');
      mockError.name = 'RequestError';

      jest.spyOn(gitHub, 'getGitHubApp').mockReturnValue({
        octokit: {
          rest: {
            apps: {
              getOrgInstallation: jest.fn().mockRejectedValue(mockError) as any,
            },
          },
        },
      } as any);

      await expect(gitHubService.checkGitHubInstallation('nonexistentOrg')).rejects.toThrow(NotFoundError);
    });

    it('should return installation id if GitHub App is installed', async () => {
      const mockResponse = { data: { id: 12345 } };

      jest.spyOn(gitHub, 'getGitHubApp').mockReturnValue({
        octokit: {
          rest: {
            apps: {
              getOrgInstallation: jest.fn().mockResolvedValue(mockResponse),
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
      jest.spyOn(gitHubService, 'getAuthorizedTeamDataByCourse').mockResolvedValue(undefined);
      jest.spyOn(gitHubService, 'getAuthorizedTeamDataByCourse').mockRejectedValue(new NotFoundError('Account not found'));

      await expect(gitHubService.getAuthorizedTeamDataByCourse('nonexistentId', 'courseId')).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if course not found', async () => {
      await expect(gitHubService.getAuthorizedTeamDataByCourse('accountId', 'nonexistentId')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAuthorizedTeamDataNamesByCourse', () => {
    it('should return team data names', async () => {
      const mockTeamDatas = [
        { _id: '1', repoName: 'team1' },
        { _id: '2', repoName: 'team2' },
      ];
      jest.spyOn(gitHubService, 'getAuthorizedTeamDataByCourse').mockResolvedValue(mockTeamDatas as any);

      const result = await gitHubService.getAuthorizedTeamDataNamesByCourse('accountId', 'courseId');

      expect(result).toEqual([
        { _id: '1', repoName: 'team1' },
        { _id: '2', repoName: 'team2' },
      ]);
    });
  });
});
