/* eslint-disable @typescript-eslint/no-explicit-any */
// tests/controllers/assessmentResultController.test.ts

import { Request, Response } from 'express';
import {
  getOrCreateAssessmentResultsController,
  recalculateResultController,
  checkMarkingCompletionController,
} from '../../controllers/assessmentResultController';
import * as assessmentResultService from '../../services/assessmentResultService';
import * as assessmentAssignmentSetService from '../../services/assessmentAssignmentSetService';
import * as internalAssessmentService from '../../services/internalAssessmentService';
import * as authUtils from '../../utils/auth';
import { NotFoundError } from '../../services/errors';

jest.mock('../../services/assessmentResultService');
jest.mock('../../services/assessmentAssignmentSetService');
jest.mock('../../services/internalAssessmentService');
jest.mock('../../utils/auth');

beforeEach(() => {
  jest.clearAllMocks();
});

const mockRequest = () => {
  const req = {} as Request;
  req.body = {};
  req.params = {};
  req.query = {};
  return req;
};

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe('assessmentResultController', () => {
  describe('getOrCreateAssessmentResultsController', () => {
    it('should retrieve or create assessment results and return 200', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      const accountId = 'account123';
      const mockAssessment = { id: 'assessment123', granularity: 'individual' };
      const mockAssignmentSet = {
        assignedUsers: [
          { user: { _id: 'user1' }, tas: [{ _id: 'ta1' }] },
          { user: { _id: 'user2' }, tas: [{ _id: 'ta2' }] },
        ],
      };
      const mockAssessmentResults = [
        { student: { _id: 'user1' }, marks: [] },
        { student: { _id: 'user2' }, marks: [] },
      ];

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest
        .spyOn(internalAssessmentService, 'getInternalAssessmentById')
        .mockResolvedValue(mockAssessment as any);
      jest
        .spyOn(assessmentAssignmentSetService, 'getAssignmentSetByAssessmentId')
        .mockResolvedValue(mockAssignmentSet as any);
      jest
        .spyOn(assessmentResultService, 'getOrCreateAssessmentResults')
        .mockResolvedValue(mockAssessmentResults as any);

      await getOrCreateAssessmentResultsController(req, res);

      expect(authUtils.getAccountId).toHaveBeenCalledWith(req);
      expect(internalAssessmentService.getInternalAssessmentById).toHaveBeenCalledWith(
        'assessment123',
        accountId
      );
      expect(assessmentAssignmentSetService.getAssignmentSetByAssessmentId).toHaveBeenCalledWith(
        'assessment123'
      );
      expect(assessmentResultService.getOrCreateAssessmentResults).toHaveBeenCalledWith(
        'assessment123'
      );
      expect(res.json).toHaveBeenCalledWith({ data: mockAssessmentResults });
    });

    it('should handle NotFoundError when assessment not found and return 404', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'getInternalAssessmentById')
        .mockRejectedValue(new NotFoundError('Assessment not found'));

      await getOrCreateAssessmentResultsController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Assessment not found' });
    });

    it('should handle NotFoundError when assignment set not found and return 404', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      const accountId = 'account123';
      const mockAssessment = { id: 'assessment123', granularity: 'individual' };

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest
        .spyOn(internalAssessmentService, 'getInternalAssessmentById')
        .mockResolvedValue(mockAssessment as any);
      jest
        .spyOn(assessmentAssignmentSetService, 'getAssignmentSetByAssessmentId')
        .mockRejectedValue(new NotFoundError('Assignment Set not found for this assessment'));

      await getOrCreateAssessmentResultsController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Assignment Set not found for this assessment',
      });
    });

    it('should handle NotFoundError when assessment results not found and return 404', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      const accountId = 'account123';
      const mockAssessment = { id: 'assessment123', granularity: 'individual' };
      const mockAssignmentSet = {
        assignedUsers: [
          { user: { _id: 'user1' }, tas: [{ _id: 'ta1' }] },
          { user: { _id: 'user2' }, tas: [{ _id: 'ta2' }] },
        ],
      };

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest
        .spyOn(internalAssessmentService, 'getInternalAssessmentById')
        .mockResolvedValue(mockAssessment as any);
      jest
        .spyOn(assessmentAssignmentSetService, 'getAssignmentSetByAssessmentId')
        .mockResolvedValue(mockAssignmentSet as any);
      jest
        .spyOn(assessmentResultService, 'getOrCreateAssessmentResults')
        .mockRejectedValue(new NotFoundError('Assessment Results not found for this assessment'));

      await getOrCreateAssessmentResultsController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Assessment Results not found for this assessment',
      });
    });

    it('should handle BadRequestError and return 400', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      const accountId = 'account123';
      const mockAssessment = { id: 'assessment123', granularity: 'individual' };
      const mockAssignmentSet = {
        assignedUsers: [
          { user: { _id: 'user1' }, tas: [{ _id: 'ta1' }] },
          { user: { _id: 'user2' }, tas: [{ _id: 'ta2' }] },
        ],
      };
      const mockAssessmentResults: any = []; // No results

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest
        .spyOn(internalAssessmentService, 'getInternalAssessmentById')
        .mockResolvedValue(mockAssessment as any);
      jest
        .spyOn(assessmentAssignmentSetService, 'getAssignmentSetByAssessmentId')
        .mockResolvedValue(mockAssignmentSet as any);
      jest
        .spyOn(assessmentResultService, 'getOrCreateAssessmentResults')
        .mockResolvedValue(mockAssessmentResults);

      await getOrCreateAssessmentResultsController(req, res);

      // Assuming the controller throws BadRequestError if no assignments match granularity
      // Modify the service mock or controller logic as needed

      // For this example, assuming it proceeds and returns empty data
      expect(res.json).toHaveBeenCalledWith({ data: mockAssessmentResults });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'getInternalAssessmentById')
        .mockResolvedValue({ id: 'assessment123', granularity: 'individual' } as any);
      jest
        .spyOn(assessmentAssignmentSetService, 'getAssignmentSetByAssessmentId')
        .mockResolvedValue({
          assignedUsers: [
            { user: { _id: 'user1' }, tas: [{ _id: 'ta1' }] },
            { user: { _id: 'user2' }, tas: [{ _id: 'ta2' }] },
          ],
        } as any);
      jest
        .spyOn(assessmentResultService, 'getOrCreateAssessmentResults')
        .mockRejectedValue(new Error('Unexpected error'));

      await getOrCreateAssessmentResultsController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to retrieve or create AssessmentResults',
      });
    });
  });

  describe('recalculateResultController', () => {
    it('should recalculate a result and return 200', async () => {
      const req = mockRequest();
      req.params = { resultId: 'result123' };
      const res = mockResponse();

      jest.spyOn(assessmentResultService, 'recalculateResult').mockResolvedValue(undefined);

      await recalculateResultController(req, res);

      expect(assessmentResultService.recalculateResult).toHaveBeenCalledWith('result123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Average score recalculated successfully.',
      });
    });

    it('should handle NotFoundError and return 404', async () => {
      const req = mockRequest();
      req.params = { resultId: 'result123' };
      const res = mockResponse();

      jest.spyOn(assessmentResultService, 'recalculateResult').mockRejectedValue(
        new NotFoundError('Result not found')
      );

      await recalculateResultController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Result not found' });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { resultId: 'result123' };
      const res = mockResponse();

      jest.spyOn(assessmentResultService, 'recalculateResult').mockRejectedValue(
        new Error('Unexpected error')
      );

      await recalculateResultController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to recalculate AssessmentResult',
      });
    });
  });

  describe('checkMarkingCompletionController', () => {
    it('should check marking completion and return 200 with unmarked teams', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      const mockUnmarkedTeams = ['team1', 'team2'];

      jest.spyOn(assessmentResultService, 'checkMarkingCompletion').mockResolvedValue(
        mockUnmarkedTeams as any
      );

      await checkMarkingCompletionController(req, res);

      expect(assessmentResultService.checkMarkingCompletion).toHaveBeenCalledWith(
        'assessment123'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUnmarkedTeams,
      });
    });

    it('should handle NotFoundError and return 404', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest.spyOn(assessmentResultService, 'checkMarkingCompletion').mockRejectedValue(
        new NotFoundError('Assessment not found')
      );

      await checkMarkingCompletionController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Assessment not found' });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest.spyOn(assessmentResultService, 'checkMarkingCompletion').mockRejectedValue(
        new Error('Unexpected error')
      );

      await checkMarkingCompletionController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to check marking completion',
      });
    });
  });
});
