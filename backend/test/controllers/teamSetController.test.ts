import { Request, Response } from 'express';
import * as teamSetService from '../../services/teamSetService';
import { deleteTeamSet } from '../../controllers/teamSetController';
import { NotFoundError } from '../../services/errors';

jest.mock('../../services/teamSetService');

beforeEach(() => {
  jest.clearAllMocks();
});

const mockRequest = (params = {}) => {
  const req = {} as Request;
  req.params = params;
  return req;
};

const mockResponse = () => {
  const res = {
    setHeader: jest.fn(),
  } as unknown as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('teamSetController', () => {
  describe('deleteTeamSet', () => {
    it('should delete a teamSet and return a success response', async () => {
      const req = mockRequest({ id: 'teamSetId' });
      const res = mockResponse();

      jest
        .spyOn(teamSetService, 'deleteTeamSetById')
        .mockResolvedValue(undefined);

      await deleteTeamSet(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'TeamSet deleted successfully',
      });
    });

    it('should return a 404 error when the teamSet is not found', async () => {
      const req = mockRequest({ id: 'nonExistentTeamSetId' });
      const res = mockResponse();

      jest
        .spyOn(teamSetService, 'deleteTeamSetById')
        .mockRejectedValue(new NotFoundError('TeamSet not found'));

      await deleteTeamSet(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({ error: 'TeamSet not found' });
    });

    it('should handle server errors', async () => {
      const req = mockRequest({ id: 'teamSetId' });
      const res = mockResponse();
      const error = new Error('Server error');

      jest.spyOn(teamSetService, 'deleteTeamSetById').mockRejectedValue(error);

      await deleteTeamSet(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to delete TeamSet',
      });
    });
  });
});
