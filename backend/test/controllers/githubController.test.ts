/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import {
  checkInstallation,
  getAllTeamData,
  getAllTeamDataByOrg,
  getAllTeamDataByCourse,
  getAllTeamDataNamesByCourse,
} from '../../controllers/githubController';
import { NotFoundError, MissingAuthorizationError } from '../../services/errors';
import * as githubService from '../../services/githubService';
import * as auth from '../../utils/auth';

jest.mock('../../services/githubService');
jest.mock('../../utils/auth');

beforeEach(() => {
  jest.clearAllMocks();
});

const mockRequest = (body = {}, params = {}, query = {}) => {
  const req = {} as Request;
  req.body = body;
  req.params = params;
  req.query = query;
  return req;
};

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('gitHubController', () => {
  describe('getAllTeamData', () => {
    it('should retrieve all team data and send a 200 status', async () => {
      const req = mockRequest();
      const res = mockResponse();
      const mockTeamData = [{ teamId: 'team1', data: 'data1' }];

      jest
        .spyOn(githubService, 'fetchAllTeamData')
        .mockResolvedValue(mockTeamData as any);

      await getAllTeamData(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ teamData: mockTeamData });
    });

    it('should handle errors when retrieving all team data', async () => {
      const req = mockRequest();
      const res = mockResponse();
      const error = new Error('Error fetching team data');

      jest.spyOn(githubService, 'fetchAllTeamData').mockRejectedValue(error);

      await getAllTeamData(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to get all teams data',
      });
    });
  });

  describe('getAllTeamDataForOrg', () => {
    it('should retrieve all team data for an organization and send a 200 status', async () => {
      const req = mockRequest({}, { gitHubOrgName: 'org1' });
      const res = mockResponse();
      const mockTeamDatas = [{ teamId: 'team1', data: 'data1' }];

      jest
        .spyOn(githubService, 'fetchAllTeamDataForOrg')
        .mockResolvedValue(mockTeamDatas as any);

      await getAllTeamDataByOrg(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockTeamDatas);
    });

    it('should handle NotFoundError when retrieving team data for an organization', async () => {
      const req = mockRequest({}, { gitHubOrgName: 'org1' });
      const res = mockResponse();
      const error = new NotFoundError('Organization not found');

      jest
        .spyOn(githubService, 'fetchAllTeamDataForOrg')
        .mockRejectedValue(error);

      await getAllTeamDataByOrg(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: error.message });
    });

    it('should handle errors when retrieving team data for an organization', async () => {
      const req = mockRequest({}, { gitHubOrgName: 'org1' });
      const res = mockResponse();
      const error = new Error('Error fetching team data for org');

      jest
        .spyOn(githubService, 'fetchAllTeamDataForOrg')
        .mockRejectedValue(error);

      await getAllTeamDataByOrg(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to get team datas for org',
      });
    });
  });

  describe('getAllTeamDataByCourse', () => {
    it('should retrieve all authorized team data for a course and send a 200 status', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();
      const mockTeams = [{ teamId: 'team1', data: 'data1' }];

      jest.spyOn(auth, 'getAccountId').mockResolvedValue('accountId');
      jest
        .spyOn(githubService, 'getAuthorizedTeamDataByCourse')
        .mockResolvedValue(mockTeams as any);

      await getAllTeamDataByCourse(req, res);

      expect(auth.getAccountId).toHaveBeenCalledWith(req);
      expect(githubService.getAuthorizedTeamDataByCourse).toHaveBeenCalledWith(
        'accountId',
        'courseId'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockTeams);
    });

    it('should handle NotFoundError when course is not found', async () => {
      const req = mockRequest({}, { id: 'invalidCourseId' });
      const res = mockResponse();
      const error = new NotFoundError('Course not found');

      jest.spyOn(auth, 'getAccountId').mockResolvedValue('accountId');
      jest
        .spyOn(githubService, 'getAuthorizedTeamDataByCourse')
        .mockRejectedValue(error);

      await getAllTeamDataByCourse(req, res);

      expect(auth.getAccountId).toHaveBeenCalledWith(req);
      expect(githubService.getAuthorizedTeamDataByCourse).toHaveBeenCalledWith(
        'accountId',
        'invalidCourseId'
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should handle MissingAuthorizationError when authorization is missing', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();
      const error = new MissingAuthorizationError('Missing authorization');

      jest.spyOn(auth, 'getAccountId').mockRejectedValue(error);
      jest
        .spyOn(githubService, 'getAuthorizedTeamDataByCourse')
        .mockResolvedValue([] as any);

      await getAllTeamDataByCourse(req, res);

      expect(auth.getAccountId).toHaveBeenCalledWith(req);
      expect(githubService.getAuthorizedTeamDataByCourse).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization' });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();
      const error = new Error('Unexpected server error');

      jest.spyOn(auth, 'getAccountId').mockResolvedValue('accountId');
      jest
        .spyOn(githubService, 'getAuthorizedTeamDataByCourse')
        .mockRejectedValue(error);

      await getAllTeamDataByCourse(req, res);

      expect(auth.getAccountId).toHaveBeenCalledWith(req);
      expect(githubService.getAuthorizedTeamDataByCourse).toHaveBeenCalledWith(
        'accountId',
        'courseId'
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch teams' });
    });
  });

  describe('getAllTeamDataNamesByCourse', () => {
    it('should retrieve all authorized team data names for a course and send a 200 status', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();
      const mockTeamNames = ['Team 1', 'Team 2'];

      jest.spyOn(auth, 'getAccountId').mockResolvedValue('accountId');
      jest
        .spyOn(githubService, 'getAuthorizedTeamDataNamesByCourse')
        .mockResolvedValue(mockTeamNames as any);

      await getAllTeamDataNamesByCourse(req, res);

      expect(auth.getAccountId).toHaveBeenCalledWith(req);
      expect(githubService.getAuthorizedTeamDataNamesByCourse).toHaveBeenCalledWith(
        'accountId',
        'courseId'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockTeamNames);
    });

    it('should handle NotFoundError when course is not found', async () => {
      const req = mockRequest({}, { id: 'invalidCourseId' });
      const res = mockResponse();
      const error = new NotFoundError('Course not found');

      jest.spyOn(auth, 'getAccountId').mockResolvedValue('accountId');
      jest
        .spyOn(githubService, 'getAuthorizedTeamDataNamesByCourse')
        .mockRejectedValue(error);

      await getAllTeamDataNamesByCourse(req, res);

      expect(auth.getAccountId).toHaveBeenCalledWith(req);
      expect(githubService.getAuthorizedTeamDataNamesByCourse).toHaveBeenCalledWith(
        'accountId',
        'invalidCourseId'
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should handle MissingAuthorizationError when authorization is missing', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();
      const error = new MissingAuthorizationError('Missing authorization');

      jest.spyOn(auth, 'getAccountId').mockRejectedValue(error);
      jest
        .spyOn(githubService, 'getAuthorizedTeamDataNamesByCourse')
        .mockResolvedValue([] as any);

      await getAllTeamDataNamesByCourse(req, res);

      expect(auth.getAccountId).toHaveBeenCalledWith(req);
      expect(githubService.getAuthorizedTeamDataNamesByCourse).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization' });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();
      const error = new Error('Unexpected server error');

      jest.spyOn(auth, 'getAccountId').mockResolvedValue('accountId');
      jest
        .spyOn(githubService, 'getAuthorizedTeamDataNamesByCourse')
        .mockRejectedValue(error);

      await getAllTeamDataNamesByCourse(req, res);

      expect(auth.getAccountId).toHaveBeenCalledWith(req);
      expect(githubService.getAuthorizedTeamDataNamesByCourse).toHaveBeenCalledWith(
        'accountId',
        'courseId'
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch teams' });
    });
  });

  describe('checkInstallation', () => {
    it('should check GitHub installation and send a 200 status', async () => {
      const req = mockRequest({ orgName: 'org1' });
      const res = mockResponse();
      const mockInstallationId = 'installation_id_1';

      jest
        .spyOn(githubService, 'checkGitHubInstallation')
        .mockResolvedValue(mockInstallationId as any);

      await checkInstallation(req, res);

      expect(githubService.checkGitHubInstallation).toHaveBeenCalledWith('org1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        installationId: mockInstallationId,
      });
    });

    it('should handle NotFoundError when checking GitHub installation', async () => {
      const req = mockRequest({ orgName: 'nonexistent-org' });
      const res = mockResponse();
      const error = new NotFoundError('GitHub Organization not found');

      jest
        .spyOn(githubService, 'checkGitHubInstallation')
        .mockRejectedValue(error);

      await checkInstallation(req, res);

      expect(githubService.checkGitHubInstallation).toHaveBeenCalledWith('nonexistent-org');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: error.message });
    });

    it('should handle errors when checking GitHub installation', async () => {
      const req = mockRequest({ orgName: 'org1' });
      const res = mockResponse();
      const error = new Error('Error checking GitHub installation');

      jest
        .spyOn(githubService, 'checkGitHubInstallation')
        .mockRejectedValue(error);

      await checkInstallation(req, res);

      expect(githubService.checkGitHubInstallation).toHaveBeenCalledWith('org1');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'An error occurred while checking the installation status.',
      });
    });
  });
});
