import { Request, Response } from 'express';
import * as teamService from '../../services/teamService';
import { deleteTeam, updateTeam } from '../../controllers/teamController';
import { NotFoundError } from '../../services/errors';

jest.mock('../../services/teamService', () => ({
  deleteTeamById: jest.fn(),
  updateTeamById: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

const mockRequest = (params = {}, body = {}) => {
  const req = {} as Request;
  req.params = params;
  req.body = body;
  return req;
};

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('deleteTeam', () => {
  it('should delete a team and return a success response', async () => {
    const req = mockRequest({ id: 'teamId' });
    const res = mockResponse();

    jest.spyOn(teamService, 'deleteTeamById').mockResolvedValue(undefined);

    await deleteTeam(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Team deleted successfully',
    });
  });

  it('should return a 404 error when the team is not found', async () => {
    const req = mockRequest({ id: 'nonExistentTeamId' });
    const res = mockResponse();

    jest
      .spyOn(teamService, 'deleteTeamById')
      .mockRejectedValue(new NotFoundError('Team not found'));

    await deleteTeam(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Team not found' });
  });

  it('should handle server errors during team deletion', async () => {
    const req = mockRequest({ id: 'teamId' });
    const res = mockResponse();
    const error = new Error('Server error');

    jest.spyOn(teamService, 'deleteTeamById').mockRejectedValue(error);

    await deleteTeam(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Failed to delete team',
    });
  });
});

describe('updateTeam', () => {
  it('should update a team and return a success response', async () => {
    const req = mockRequest({ id: 'teamId' }, { name: 'Updated Team Name' });
    const res = mockResponse();

    jest.spyOn(teamService, 'updateTeamById').mockResolvedValue(undefined);

    await updateTeam(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Team updated successfully',
    });
  });

  it('should return a 404 error when the team to update is not found', async () => {
    const req = mockRequest(
      { id: 'nonExistentTeamId' },
      { name: 'Updated Team Name' }
    );
    const res = mockResponse();

    jest
      .spyOn(teamService, 'updateTeamById')
      .mockRejectedValue(new NotFoundError('Team not found'));

    await updateTeam(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Team not found' });
  });

  it('should handle server errors during team update', async () => {
    const req = mockRequest({ id: 'teamId' }, { name: 'Updated Team Name' });
    const res = mockResponse();
    const error = new Error('Server error');

    jest.spyOn(teamService, 'updateTeamById').mockRejectedValue(error);

    await updateTeam(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Failed to update team',
    });
  });
});
