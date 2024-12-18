import { Request, Response } from 'express';
import {
  getAllCodeAnalysisData,
  getAllCodeAnalysisDataByCourse,
  getAllCodeAnalysisDataByOrg,
} from '../../controllers/codeAnalysisController';
import { MissingAuthorizationError, NotFoundError } from '../../services/errors';
import * as codeAnalysisService from '../../services/codeAnalysisService';
import * as auth from '../../utils/auth';

jest.mock('../../services/codeAnalysisService');

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

describe('codeAnalysisController', () => {
  it('should retrieve all code analysis data and send a 200 status', async () => {
    const req = mockRequest();
    const res = mockResponse();
    const mockCodeAnalysisData = [{ teamId: 'team1', data: 'data1' }];

    jest
      .spyOn(codeAnalysisService, 'fetchAllCodeAnalysisData')
      .mockResolvedValue(mockCodeAnalysisData as any);

    await getAllCodeAnalysisData(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      codeAnalysisData: mockCodeAnalysisData,
    });
  });

  it('should handle errors when retrieving all code analysis data', async () => {
    const req = mockRequest();
    const res = mockResponse();
    const error = new Error('Error fetching code analysis data');

    jest
      .spyOn(codeAnalysisService, 'fetchAllCodeAnalysisData')
      .mockRejectedValue(error);

    await getAllCodeAnalysisData(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Failed to get all code analysis data',
    });
  });
});

describe('codeAnalysisController', () => {
  describe('getAllCodeAnalysisDataByOrg', () => {
    it('should retrieve all code analysis data for an organization and send a 200 status', async () => {
      const req = mockRequest({ gitHubOrgName: 'org1' });
      const res = mockResponse();
      const mockCodeAnalysisData = [{ teamId: 'team1', data: 'data1' }];

      jest
        .spyOn(codeAnalysisService, 'fetchAllCodeAnalysisDataForOrg')
        .mockResolvedValue(mockCodeAnalysisData as any);

      await getAllCodeAnalysisDataByOrg(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCodeAnalysisData);
    });

    it('should handle errors when retrieving all code analysis data for an organization', async () => {
      const req = mockRequest({ gitHubOrgName: 'org1' });
      const res = mockResponse();
      const error = new NotFoundError('Code analysis data not found');

      jest
        .spyOn(codeAnalysisService, 'fetchAllCodeAnalysisDataForOrg')
        .mockRejectedValue(error);

      await getAllCodeAnalysisDataByOrg(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: error.message });
    });

    it('should handle errors when retrieving all code analysis data for an organization', async () => {
      const req = mockRequest({ gitHubOrgName: 'org1' });
      const res = mockResponse();
      const error = new Error('Error fetching code analysis data');

      jest
        .spyOn(codeAnalysisService, 'fetchAllCodeAnalysisDataForOrg')
        .mockRejectedValue(error);

      await getAllCodeAnalysisDataByOrg(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to get code analysis datas for org',
      });
    });
  });

  describe('codeAnalysisController', () => {
    describe('getAllCodeAnalysisDataByCourse', () => {
      it('should retrieve all code analysis data for course and send a 200 status', async () => {
        const req = mockRequest({}, { id: 'course1' });
        const res = mockResponse();
        const mockCodeAnalyses = [{ teamId: 'team1', data: 'data1' }];

        jest.spyOn(auth, 'getAccountId').mockResolvedValue('accountId');
        jest
          .spyOn(codeAnalysisService, 'getAuthorizedCodeAnalysisDataByCourse')
          .mockResolvedValue(mockCodeAnalyses as any);

        await getAllCodeAnalysisDataByCourse(req, res);

        expect(auth.getAccountId).toHaveBeenCalledWith(req);
        expect(
          codeAnalysisService.getAuthorizedCodeAnalysisDataByCourse
        ).toHaveBeenCalledWith('accountId', 'course1');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockCodeAnalyses);
      });

      it('should handle NotFoundError and send a 404 status', async () => {
        const req = mockRequest({}, { id: 'course1' });
        const res = mockResponse();
        const error = new NotFoundError('Code analysis data not found');

        jest.spyOn(auth, 'getAccountId').mockResolvedValue('accountId');
        jest
          .spyOn(codeAnalysisService, 'getAuthorizedCodeAnalysisDataByCourse')
          .mockRejectedValue(error);

        await getAllCodeAnalysisDataByCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: error.message });
      });

      it('should handle MissingAuthorizationError and send a 400 status', async () => {
        const req = mockRequest({}, { id: 'course1' });
        const res = mockResponse();
        const error = new MissingAuthorizationError('Missing authorization');

        jest.spyOn(auth, 'getAccountId').mockResolvedValue('accountId');
        jest
          .spyOn(codeAnalysisService, 'getAuthorizedCodeAnalysisDataByCourse')
          .mockRejectedValue(error);

        await getAllCodeAnalysisDataByCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Missing authorization',
        });
      });

      it('should handle generic errors and send a 500 status', async () => {
        const req = mockRequest({}, { id: 'course1' });
        const res = mockResponse();
        const error = new Error('Unexpected error');

        jest.spyOn(auth, 'getAccountId').mockResolvedValue('accountId');
        jest
          .spyOn(codeAnalysisService, 'getAuthorizedCodeAnalysisDataByCourse')
          .mockRejectedValue(error);

        await getAllCodeAnalysisDataByCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Failed to fetch code analyses',
        });
      });
    });
  });
});
