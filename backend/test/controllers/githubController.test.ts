import { Request, Response } from 'express';
import * as githubService from '../../services/githubService';
import {
  getAllTeamData,
  getAllTeamDataForOrg,
  checkInstallation,
} from '../../controllers/githubController';
import { NotFoundError } from '../../services/errors';

jest.mock('../../services/githubService');

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

    await getAllTeamDataForOrg(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ teamDatas: mockTeamDatas });
  });

  it('should handle NotFoundError when retrieving team data for an organization', async () => {
    const req = mockRequest({}, { gitHubOrgName: 'org1' });
    const res = mockResponse();
    const error = new NotFoundError('Organization not found');

    jest
      .spyOn(githubService, 'fetchAllTeamDataForOrg')
      .mockRejectedValue(error);

    await getAllTeamDataForOrg(req, res);

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

    await getAllTeamDataForOrg(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Failed to get team datas for org',
    });
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

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'An error occurred while checking the installation status.',
    });
  });
});
