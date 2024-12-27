/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import {
  createAssignmentSetController,
  getAssignmentSetController,
  updateAssignmentSetController,
  getAssignmentsByGraderIdController,
} from '../../controllers/assessmentAssignmentSetController';
import * as assessmentAssignmentSetService from '../../services/assessmentAssignmentSetService';
import * as accountService from '../../services/accountService';
import * as authUtils from '../../utils/auth';
import { BadRequestError, NotFoundError } from '../../services/errors';

jest.mock('../../services/assessmentAssignmentSetService');
jest.mock('../../services/accountService');
jest.mock('../../utils/auth');

beforeEach(() => {
  jest.clearAllMocks();
});

const mockRequest = () => {
  const req = {} as Request;
  req.body = {};
  req.params = {};
  return req;
};

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('assessmentAssignmentSetController', () => {
  describe('createAssignmentSetController', () => {
    it('should create a new AssessmentAssignmentSet and return 201', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      req.body = { originalTeamSetId: 'teamSet123' };
      const res = mockResponse();

      const mockAssignmentSet = { id: 'assignmentSet123' };

      jest
        .spyOn(assessmentAssignmentSetService, 'createAssignmentSet')
        .mockResolvedValue(mockAssignmentSet as any);

      await createAssignmentSetController(req, res);

      expect(
        assessmentAssignmentSetService.createAssignmentSet
      ).toHaveBeenCalledWith('assessment123', 'teamSet123');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockAssignmentSet);
    });

    it('should return 400 if originalTeamSetId is missing', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      req.body = {};
      const res = mockResponse();

      await createAssignmentSetController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'originalTeamSetId is required',
      });
    });

    it('should handle BadRequestError and return 400', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      req.body = { originalTeamSetId: 'teamSet123' };
      const res = mockResponse();

      jest
        .spyOn(assessmentAssignmentSetService, 'createAssignmentSet')
        .mockRejectedValue(new BadRequestError('Invalid data'));

      await createAssignmentSetController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid data' });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      req.body = { originalTeamSetId: 'teamSet123' };
      const res = mockResponse();

      jest
        .spyOn(assessmentAssignmentSetService, 'createAssignmentSet')
        .mockRejectedValue(new Error('Some error'));

      await createAssignmentSetController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to create AssessmentAssignmentSet',
      });
    });
  });

  describe('getAssignmentSetController', () => {
    it('should retrieve an AssessmentAssignmentSet and return 200', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      const mockAssignmentSet = {
        assignedTeams: ['team1', 'team2'],
        assignedUsers: null,
      };

      jest
        .spyOn(assessmentAssignmentSetService, 'getAssignmentSetByAssessmentId')
        .mockResolvedValue(mockAssignmentSet as any);

      await getAssignmentSetController(req, res);

      expect(
        assessmentAssignmentSetService.getAssignmentSetByAssessmentId
      ).toHaveBeenCalledWith('assessment123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(['team1', 'team2']);
    });

    it('should handle NotFoundError and return 404', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest
        .spyOn(assessmentAssignmentSetService, 'getAssignmentSetByAssessmentId')
        .mockRejectedValue(new NotFoundError('AssignmentSet not found'));

      await getAssignmentSetController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'AssignmentSet not found',
      });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest
        .spyOn(assessmentAssignmentSetService, 'getAssignmentSetByAssessmentId')
        .mockRejectedValue(new Error('Some error'));

      await getAssignmentSetController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to fetch AssessmentAssignmentSet',
      });
    });
  });

  describe('updateAssignmentSetController', () => {
    it('should update the assignedTeams and return 200', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      req.body = { assignedTeams: ['team1', 'team2'], assignedUsers: null };
      const res = mockResponse();

      const updatedSet = {
        assignedTeams: ['team1', 'team2'],
        assignedUsers: null,
      };

      jest
        .spyOn(assessmentAssignmentSetService, 'updateAssignmentSet')
        .mockResolvedValue(updatedSet as any);

      await updateAssignmentSetController(req, res);

      expect(
        assessmentAssignmentSetService.updateAssignmentSet
      ).toHaveBeenCalledWith('assessment123', ['team1', 'team2'], null);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedSet);
    });

    it('should handle BadRequestError and return 400', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      req.body = { assignedTeams: ['team1', 'team2'], assignedUsers: null };
      const res = mockResponse();

      jest
        .spyOn(assessmentAssignmentSetService, 'updateAssignmentSet')
        .mockRejectedValue(new BadRequestError('Invalid data'));

      await updateAssignmentSetController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid data' });
    });

    it('should handle NotFoundError and return 400', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      req.body = { assignedTeams: ['team1', 'team2'], assignedUsers: null };
      const res = mockResponse();

      jest
        .spyOn(assessmentAssignmentSetService, 'updateAssignmentSet')
        .mockRejectedValue(new NotFoundError('AssignmentSet not found'));

      await updateAssignmentSetController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'AssignmentSet not found',
      });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      req.body = { assignedTeams: ['team1', 'team2'], assignedUsers: null };
      const res = mockResponse();

      jest
        .spyOn(assessmentAssignmentSetService, 'updateAssignmentSet')
        .mockRejectedValue(new Error('Some error'));

      await updateAssignmentSetController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to update AssessmentAssignmentSet',
      });
    });
  });

  describe('getAssignmentsByTAIdController', () => {
    it('should retrieve assignments for the TA and return 200', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      const accountId = 'account123';
      const userId = 'user123';
      const assignments = ['team1', 'team2'];

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest
        .spyOn(accountService, 'getUserIdByAccountId')
        .mockResolvedValue(userId);
      jest
        .spyOn(assessmentAssignmentSetService, 'getAssignmentsByTAId')
        .mockResolvedValue(assignments as any);

      await getAssignmentsByGraderIdController(req, res);

      expect(authUtils.getAccountId).toHaveBeenCalledWith(req);
      expect(accountService.getUserIdByAccountId).toHaveBeenCalledWith(
        accountId
      );
      expect(
        assessmentAssignmentSetService.getAssignmentsByTAId
      ).toHaveBeenCalledWith(userId, 'assessment123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(assignments);
    });

    it('should handle NotFoundError and return 404', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      const accountId = 'account123';
      const userId = 'user123';

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest
        .spyOn(accountService, 'getUserIdByAccountId')
        .mockResolvedValue(userId);
      jest
        .spyOn(assessmentAssignmentSetService, 'getAssignmentsByTAId')
        .mockRejectedValue(new NotFoundError('Assignments not found'));

      await getAssignmentsByGraderIdController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Assignments not found' });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      const accountId = 'account123';
      const userId = 'user123';

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest
        .spyOn(accountService, 'getUserIdByAccountId')
        .mockResolvedValue(userId);
      jest
        .spyOn(assessmentAssignmentSetService, 'getAssignmentsByTAId')
        .mockRejectedValue(new Error('Some error'));

      await getAssignmentsByGraderIdController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to fetch assignments by grader',
      });
    });
  });
});
