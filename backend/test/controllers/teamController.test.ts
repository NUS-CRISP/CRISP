import { Request, Response } from 'express';
import * as teamService from '../../services/teamService';
import * as accountService from '../../services/accountService';
import {
  deleteTeam,
  getTeamsByCourse,
  getTeamsByTAAndCourse,
  removeMembersFromTeam,
  updateTeam,
} from '../../controllers/teamController';
import { NotFoundError } from '../../services/errors';
import { Team } from '@models/Team';
import { getAccountId } from '../../utils/auth';
import { getTeamsByTAIdAndCourseId } from '../../services/teamService';
import { getUserIdByAccountId } from '../../services/accountService';

jest.mock('../../services/teamService');
jest.mock('../../utils/auth');

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
describe('teamController', () => {
  describe('getTeamsByTAAndCourse', () => {
    it('should retrieve teams for a TA and course and send a 200 status', async () => {
      const req = mockRequest({ courseId: 'course123' });
      const res = mockResponse();
      const mockAccountId = 'account123';
      const mockUserId = 'user123';
      const mockTeams = [{ teamId: 'team1' }, { teamId: 'team2' }];

      // Mock getAccountId to return mockAccountId
      (getAccountId as jest.Mock).mockResolvedValue(mockAccountId);

      // Mock getUserIdByAccountId and getTeamsByTAIdAndCourseId
      jest.spyOn(accountService, 'getUserIdByAccountId').mockResolvedValue(mockUserId);
      jest.spyOn(teamService, 'getTeamsByTAIdAndCourseId').mockResolvedValue(mockTeams as unknown as Team[]);

      await getTeamsByTAAndCourse(req, res);

      expect(getAccountId).toHaveBeenCalledWith(req);
      expect(getUserIdByAccountId).toHaveBeenCalledWith(mockAccountId);
      expect(getTeamsByTAIdAndCourseId).toHaveBeenCalledWith(mockUserId, 'course123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockTeams);
    });

    it('should handle unexpected errors and send a 500 status', async () => {
      const req = mockRequest({ courseId: 'course123' });
      const res = mockResponse();
      const mockAccountId = 'account123';
      const mockUserId = 'user123';
      const error = new Error('Unexpected server error');

      // Mock getAccountId to return mockAccountId
      (getAccountId as jest.Mock).mockResolvedValue(mockAccountId);

      // Mock getUserIdByAccountId to return mockUserId
      jest.spyOn(accountService, 'getUserIdByAccountId').mockResolvedValue(mockUserId);

      // Mock getTeamsByTAIdAndCourseId to throw generic error
      jest.spyOn(teamService, 'getTeamsByTAIdAndCourseId').mockRejectedValue(error);

      await getTeamsByTAAndCourse(req, res);

      expect(getAccountId).toHaveBeenCalledWith(req);
      expect(getUserIdByAccountId).toHaveBeenCalledWith(mockAccountId);
      expect(getTeamsByTAIdAndCourseId).toHaveBeenCalledWith(mockUserId, 'course123');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch teams' });
    });
  });

  describe('getTeamsByCourse', () => {
    it('should return a list of teams for a course', async () => {
      const req = mockRequest({ courseId: 'courseId' });
      const res = mockResponse();
      const teams = [{ name: 'Team 1' }, { name: 'Team 2' }];

      jest
        .spyOn(teamService, 'getTeamsByCourseId')
        .mockResolvedValue(teams as unknown as Team[]);

      await getTeamsByCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(teams);
    });

    it('should return a 500 error when fetching teams fails', async () => {
      const req = mockRequest({ courseId: 'courseId' });
      const res = mockResponse();
      const error = new Error('Server error');

      jest.spyOn(teamService, 'getTeamsByCourseId').mockRejectedValue(error);

      await getTeamsByCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch teams' });
    });
  });

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

  describe('removeMembersFromTeam', () => {
    it('should remove a member from a team and return a success response', async () => {
      const req = mockRequest({ id: 'teamId', userId: 'userId' });
      const res = mockResponse();

      jest.spyOn(teamService, 'removeMembersById').mockResolvedValue(undefined);

      await removeMembersFromTeam(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Members removed successfully',
      });
    });

    it('should return a 404 error when the team or user is not found', async () => {
      const req = mockRequest({ id: 'nonExistentTeamId', userId: 'userId' });
      const res = mockResponse();

      jest
        .spyOn(teamService, 'removeMembersById')
        .mockRejectedValue(new NotFoundError('Team or user not found'));

      await removeMembersFromTeam(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Team or user not found',
      });
    });

    it('should handle server errors during member removal', async () => {
      const req = mockRequest({ id: 'teamId', userId: 'userId' });
      const res = mockResponse();
      const error = new Error('Server error');

      jest.spyOn(teamService, 'removeMembersById').mockRejectedValue(error);

      await removeMembersFromTeam(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to remove member',
      });
    });
  });
});
