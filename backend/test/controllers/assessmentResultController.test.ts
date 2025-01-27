/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import {
  getOrCreateAssessmentResultsController,
  recalculateResultController,
} from '../../controllers/assessmentResultController';
import * as assessmentResultService from '../../services/assessmentResultService';
import * as assessmentAssignmentSetService from '../../services/assessmentAssignmentSetService';
import * as internalAssessmentService from '../../services/internalAssessmentService';
import * as authUtils from '../../utils/auth';
import { NotFoundError } from '../../services/errors';
import { ObjectId } from 'mongodb';
import TeamModel from '@models/Team';

jest.mock('../../services/assessmentResultService');
jest.mock('../../services/assessmentAssignmentSetService');
jest.mock('../../services/internalAssessmentService');
jest.mock('../../utils/auth');
jest.mock('../../models/Team');

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
    it('should retrieve or create assessment results and return 200 (granularity: individual)', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      const accountId = 'account123';
      const mockAssessment = { id: 'assessment123', granularity: 'individual' };
      const mockAssignmentSet = {
        assignedUsers: [
          {
            user: { _id: 'user1' },
            tas: [{ _id: new ObjectId('aaaaaabbbbbbccccccdddddd') }],
          },
          { user: { _id: 'user2' }, tas: [{ _id: 'ta2' }] },
          { user: { _id: 'user3' }, tas: [{ _id: 'ta2' }] },
        ],
      };
      const mockAssessmentResults = [
        {
          student: { _id: 'user1' },
          marks: [
            { marker: { _id: new ObjectId('aaaaaabbbbbbccccccdddddd') } },
          ],
        },
        { student: { _id: 'user2' }, marks: [] },
      ];
      const mockResolvedAssessmentResults = [
        {
          student: { _id: 'user1' },
          marks: [
            { marker: { _id: new ObjectId('aaaaaabbbbbbccccccdddddd') } },
          ],
        },
        {
          student: { _id: 'user2' },
          marks: [{ marker: { _id: 'ta2' }, score: null, submission: null }],
        },
        {
          _id: 'temp-user3',
          student: { _id: 'user3' },
          marks: [{ marker: { _id: 'ta2' }, score: null, submission: null }],
          assessment: 'assessment123',
        },
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
      expect(
        internalAssessmentService.getInternalAssessmentById
      ).toHaveBeenCalledWith('assessment123', accountId);
      expect(
        assessmentAssignmentSetService.getAssignmentSetByAssessmentId
      ).toHaveBeenCalledWith('assessment123');
      expect(
        assessmentResultService.getOrCreateAssessmentResults
      ).toHaveBeenCalledWith('assessment123');
      expect(res.json).toHaveBeenCalledWith({
        data: mockResolvedAssessmentResults,
      });
    });

    it('should retrieve or create assessment results and return 200 (granularity: team)', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      const accountId = 'account123';
      const mockAssessment = { id: 'assessment123', granularity: 'team' };

      const teamId1 = 'aaaaaaaaaaaaaaaaaaaaaaaa';
      const teamId2 = 'bbbbbbbbbbbbbbbbbbbbbbbb';
      const teamId3 = 'cccccccccccccccccccccccc';

      const marker1 = '111111111111111111111111';
      const marker2 = '222222222222222222222222';

      const mockAssignmentSet = {
        assignedTeams: [
          {
            team: { _id: teamId1 },
            tas: [{ _id: marker1 }],
          },
          {
            team: { _id: teamId2 },
            tas: [{ _id: marker2 }],
          },
          {
            team: { _id: teamId3 },
            tas: [{ _id: marker2 }],
          },
        ],
      };

      const mockTeam1 = {
        _id: teamId1,
        members: [{ _id: 'dddddddddddddddddddddddd' }],
      };
      const mockTeam2 = {
        _id: teamId2,
        members: [],
      };
      const mockTeam3 = {
        _id: teamId3,
        members: [
          { _id: 'eeeeeeeeeeeeeeeeeeeeeeee' },
          { _id: 'ffffffffffffffffffffffff' },
        ],
      };

      const mockAssessmentResults = [
        {
          student: { _id: teamId1 },
          marks: [{ marker: { _id: marker1 }, score: 75 }],
        }, // This exists just to test if anything existing in initial results is properly retrieved.
        {
          _id: 'dddddddddddddddddddddddd',
          assessment: 'assessment123',
          student: { _id: mockTeam1.members[0]._id },
          marks: [{ marker: { _id: marker1 }, score: null, submission: null }],
        },
      ];

      const mockResolvedAssessmentResults = [
        {
          student: { _id: teamId1 },
          marks: [{ marker: { _id: marker1 }, score: 75 }],
        },
        {
          _id: 'dddddddddddddddddddddddd',
          assessment: 'assessment123',
          student: { _id: mockTeam1.members[0]._id },
          marks: [{ marker: { _id: marker1 }, score: null, submission: null }],
        },
        {
          _id: 'temp-team-eeeeeeeeeeeeeeeeeeeeeeee',
          student: { _id: 'eeeeeeeeeeeeeeeeeeeeeeee' },
          marks: [{ marker: { _id: marker2 }, score: null, submission: null }],
          assessment: 'assessment123',
        },
        {
          _id: 'temp-team-ffffffffffffffffffffffff',
          student: { _id: 'ffffffffffffffffffffffff' },
          marks: [{ marker: { _id: marker2 }, score: null, submission: null }],
          assessment: 'assessment123',
        },
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

      const mockFindById = jest.spyOn(TeamModel, 'findById');
      mockFindById
        .mockImplementationOnce(
          () =>
            ({
              populate: jest.fn().mockResolvedValue(mockTeam1),
            }) as any
        )
        .mockImplementationOnce(
          () =>
            ({
              populate: jest.fn().mockResolvedValue(mockTeam2),
            }) as any
        )
        .mockImplementationOnce(
          () =>
            ({
              populate: jest.fn().mockResolvedValue(mockTeam3),
            }) as any
        );

      // Execute
      await getOrCreateAssessmentResultsController(req, res);

      // Verify
      expect(authUtils.getAccountId).toHaveBeenCalledWith(req);
      expect(
        internalAssessmentService.getInternalAssessmentById
      ).toHaveBeenCalledWith('assessment123', accountId);
      expect(
        assessmentAssignmentSetService.getAssignmentSetByAssessmentId
      ).toHaveBeenCalledWith('assessment123');
      expect(
        assessmentResultService.getOrCreateAssessmentResults
      ).toHaveBeenCalledWith('assessment123');

      // We expect 3 calls to TeamModel.findById,
      // each with the string version of the team’s _id:
      expect(TeamModel.findById).toHaveBeenCalledTimes(3);
      expect(TeamModel.findById).toHaveBeenNthCalledWith(1, teamId1);
      expect(TeamModel.findById).toHaveBeenNthCalledWith(2, teamId2);
      expect(TeamModel.findById).toHaveBeenNthCalledWith(3, teamId3);

      // Final response
      expect(res.json).toHaveBeenCalledWith({
        data: mockResolvedAssessmentResults,
      });
    });

    it('should handle NotFoundError when assessment not found and return 404', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'getInternalAssessmentById')
        .mockResolvedValue(null as any);

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
        .mockResolvedValue(null as any);

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
        .mockResolvedValue(null as any);

      await getOrCreateAssessmentResultsController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Assessment results not found for this assessment',
      });
    });

    it('should handle mismatch between team granularity and assignedUsers data and return 400', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      const accountId = 'account123';
      const mockAssessment = { id: 'assessment123', granularity: 'team' };
      const mockAssignmentSet = {
        assignedUsers: [
          { user: { _id: 'user1' }, tas: [{ _id: 'ta1' }] },
          { user: { _id: 'user2' }, tas: [{ _id: 'ta2' }] },
        ],
      };
      const mockAssessmentResults: any = [];

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

      expect(res.json).toHaveBeenCalledWith({
        error: 'Assessment is team granularity, but assignments are for users',
      });
    });

    it('should handle mismatch between individual granularity and assignedTeams data and return 400', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      const accountId = 'account123';
      const mockAssessment = { id: 'assessment123', granularity: 'individual' };
      const mockAssignmentSet = {
        assignedTeams: [
          { team: { _id: 'team1' }, tas: [{ _id: 'ta1' }] },
          { team: { _id: 'team2' }, tas: [{ _id: 'ta2' }] },
        ],
      };
      const mockAssessmentResults: any = [];

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

      expect(res.json).toHaveBeenCalledWith({
        error:
          'Assessment is individual granularity, but assignments are for teams',
      });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'getInternalAssessmentById')
        .mockResolvedValue({
          id: 'assessment123',
          granularity: 'individual',
        } as any);
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

      jest
        .spyOn(assessmentResultService, 'recalculateResult')
        .mockResolvedValue(undefined);

      await recalculateResultController(req, res);

      expect(assessmentResultService.recalculateResult).toHaveBeenCalledWith(
        'result123'
      );
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

      jest
        .spyOn(assessmentResultService, 'recalculateResult')
        .mockRejectedValue(new NotFoundError('Result not found'));

      await recalculateResultController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Result not found' });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { resultId: 'result123' };
      const res = mockResponse();

      jest
        .spyOn(assessmentResultService, 'recalculateResult')
        .mockRejectedValue(new Error('Unexpected error'));

      await recalculateResultController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to recalculate AssessmentResult',
      });
    });
  });
});
