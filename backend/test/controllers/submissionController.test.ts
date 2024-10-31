/* eslint-disable @typescript-eslint/no-explicit-any */
// tests/controllers/submissionController.test.ts

import { Request, Response } from 'express';
import {
  submitAssessment,
  getUserSubmissions,
  getAllSubmissions,
  deleteUserSubmission,
  getSubmissionByIdController,
  adjustSubmissionScoreController,
} from '../../controllers/submissionController';
import * as submissionService from '../../services/submissionService';
import * as accountService from '../../services/accountService';
import * as authUtils from '../../utils/auth';
import AccountModel from '../../models/Account';
import SubmissionModel from '../../models/Submission';
import { NotFoundError, MissingAuthorizationError } from '../../services/errors';

jest.mock('../../services/submissionService');
jest.mock('../../services/accountService');
jest.mock('../../utils/auth');
jest.mock('../../models/Account');
jest.mock('../../models/Submission');

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

describe('submissionController', () => {
  describe('submitAssessment', () => {
    it('should create a new submission and return 200', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      req.body = {
        answers: [{ questionId: 'q1', answer: 'Answer 1' }],
        isDraft: false,
      };
      const res = mockResponse();

      const accountId = 'account123';
      const userId = 'user123';
      const mockSubmission = { id: 'submission123', answers: req.body.answers };

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest.spyOn(accountService, 'getUserIdByAccountId').mockResolvedValue(userId);
      jest
        .spyOn(submissionService, 'createSubmission')
        .mockResolvedValue(mockSubmission as any);

      await submitAssessment(req, res);

      expect(authUtils.getAccountId).toHaveBeenCalledWith(req);
      expect(accountService.getUserIdByAccountId).toHaveBeenCalledWith(accountId);
      expect(submissionService.createSubmission).toHaveBeenCalledWith(
        'assessment123',
        userId,
        [{ questionId: 'q1', answer: 'Answer 1' }],
        false
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Submission saved successfully',
        submission: mockSubmission,
      });
    });

    it('should update an existing submission and return 200', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      req.body = {
        answers: [{ questionId: 'q1', answer: 'Updated Answer' }],
        isDraft: true,
        submissionId: 'submission123',
      };
      const res = mockResponse();

      const accountId = 'account123';
      const userId = 'user123';
      const mockSubmission = { id: 'submission123', answers: req.body.answers };

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest.spyOn(accountService, 'getUserIdByAccountId').mockResolvedValue(userId);
      jest
        .spyOn(submissionService, 'updateSubmission')
        .mockResolvedValue(mockSubmission as any);

      await submitAssessment(req, res);

      expect(authUtils.getAccountId).toHaveBeenCalledWith(req);
      expect(accountService.getUserIdByAccountId).toHaveBeenCalledWith(accountId);
      expect(submissionService.updateSubmission).toHaveBeenCalledWith(
        'submission123',
        userId,
        accountId,
        [{ questionId: 'q1', answer: 'Updated Answer' }],
        true
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Submission saved successfully',
        submission: mockSubmission,
      });
    });

    it('should handle BadRequestError for invalid answers and return 400', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      req.body = {
        answers: 'invalid', // Should be an array
        isDraft: false,
      };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');

      await submitAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid answers data' });
    });

    it('should handle NotFoundError and return 400', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      req.body = {
        answers: [{ questionId: 'q1', answer: 'Answer 1' }],
        isDraft: false,
      };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest.spyOn(accountService, 'getUserIdByAccountId').mockResolvedValue('user123');
      jest
        .spyOn(submissionService, 'createSubmission')
        .mockRejectedValue(new NotFoundError('Assessment not found'));

      await submitAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Assessment not found' });
    });

    it('should handle MissingAuthorizationError and return 401', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      req.body = {
        answers: [{ questionId: 'q1', answer: 'Answer 1' }],
        isDraft: false,
      };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockRejectedValue(new MissingAuthorizationError('Mising Authorization'));

      await submitAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      req.body = {
        answers: [{ questionId: 'q1', answer: 'Answer 1' }],
        isDraft: false,
      };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest.spyOn(accountService, 'getUserIdByAccountId').mockResolvedValue('user123');
      jest
        .spyOn(submissionService, 'createSubmission')
        .mockRejectedValue(new Error('Unexpected error'));

      await submitAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to submit assessment' });
    });
  });

  describe('getUserSubmissions', () => {
    it('should retrieve user submissions and return 200', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      const accountId = 'account123';
      const userId = 'user123';
      const mockSubmissions = [{ id: 'submission1' }, { id: 'submission2' }];

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest.spyOn(accountService, 'getUserIdByAccountId').mockResolvedValue(userId);
      jest
        .spyOn(submissionService, 'getSubmissionsByAssessmentAndUser')
        .mockResolvedValue(mockSubmissions as any);

      await getUserSubmissions(req, res);

      expect(authUtils.getAccountId).toHaveBeenCalledWith(req);
      expect(accountService.getUserIdByAccountId).toHaveBeenCalledWith(accountId);
      expect(submissionService.getSubmissionsByAssessmentAndUser).toHaveBeenCalledWith(
        'assessment123',
        'user123'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockSubmissions);
    });

    it('should handle NotFoundError and return 404', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest.spyOn(accountService, 'getUserIdByAccountId').mockResolvedValue('user123');
      jest
        .spyOn(submissionService, 'getSubmissionsByAssessmentAndUser')
        .mockRejectedValue(new NotFoundError('Submissions not found'));

      await getUserSubmissions(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Submissions not found' });
    });

    it('should handle MissingAuthorizationError and return 401', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockRejectedValue(new MissingAuthorizationError('Missing Authorization'));

      await getUserSubmissions(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest.spyOn(accountService, 'getUserIdByAccountId').mockResolvedValue('user123');
      jest
        .spyOn(submissionService, 'getSubmissionsByAssessmentAndUser')
        .mockRejectedValue(new Error('Unexpected error'));

      await getUserSubmissions(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to retrieve submissions' });
    });
  });

  describe('getAllSubmissions', () => {
    it('should retrieve all submissions and return 200 for admin', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      const accountId = 'admin123';
      const mockAccount = { id: accountId, role: 'admin' };
      const mockSubmissions = [{ id: 'submission1' }, { id: 'submission2' }];

      (AccountModel.findById as jest.Mock).mockResolvedValue(mockAccount);
      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest
        .spyOn(submissionService, 'getSubmissionsByAssessment')
        .mockResolvedValue(mockSubmissions as any);

      await getAllSubmissions(req, res);

      expect(authUtils.getAccountId).toHaveBeenCalledWith(req);
      expect(AccountModel.findById).toHaveBeenCalledWith(accountId);
      expect(submissionService.getSubmissionsByAssessment).toHaveBeenCalledWith(
        'assessment123'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockSubmissions);
    });

    it('should retrieve all submissions and return 200 for Faculty member', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      const accountId = 'faculty123';
      const mockAccount = { id: accountId, role: 'Faculty member' };
      const mockSubmissions = [{ id: 'submission1' }, { id: 'submission2' }];

      (AccountModel.findById as jest.Mock).mockResolvedValue(mockAccount);
      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest.spyOn(submissionService, 'getSubmissionsByAssessment').mockResolvedValue(mockSubmissions as any);

      await getAllSubmissions(req, res);

      expect(authUtils.getAccountId).toHaveBeenCalledWith(req);
      expect(AccountModel.findById).toHaveBeenCalledWith(accountId);
      expect(submissionService.getSubmissionsByAssessment).toHaveBeenCalledWith(
        'assessment123'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockSubmissions);
    });

    it('should deny access for non-admin and non-faculty roles and return 403', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      const accountId = 'user123';
      const mockAccount = { id: accountId, role: 'student' };

      (AccountModel.findById as jest.Mock).mockResolvedValue(mockAccount);
      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);

      await getAllSubmissions(req, res);

      expect(AccountModel.findById).toHaveBeenCalledWith(accountId);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access denied' });
    });

    it('should handle MissingAuthorizationError and return 403', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(null as any);

      await getAllSubmissions(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access denied' });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('admin123');
      (AccountModel.findById as jest.Mock).mockResolvedValue({ id: 'admin123', role: 'admin' });
      jest
        .spyOn(submissionService, 'getSubmissionsByAssessment')
        .mockRejectedValue(new Error('Unexpected error'));

      await getAllSubmissions(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to retrieve submissions' });
    });
  });

  describe('deleteUserSubmission', () => {
    it('should delete a user submission and return 200', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      const res = mockResponse();

      const accountId = 'account123';
      const userId = 'user123';
      const mockSubmission = { id: 'submission123', user: { equals: jest.fn().mockReturnValue(true) } };

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest.spyOn(accountService, 'getUserIdByAccountId').mockResolvedValue(userId);
      (SubmissionModel.findById as jest.Mock).mockResolvedValue(mockSubmission);
      jest.spyOn(submissionService, 'deleteSubmission').mockResolvedValue(undefined);

      mockSubmission.user.equals.mockReturnValue(true);

      await deleteUserSubmission(req, res);

      expect(authUtils.getAccountId).toHaveBeenCalledWith(req);
      expect(accountService.getUserIdByAccountId).toHaveBeenCalledWith(accountId);
      expect(SubmissionModel.findById).toHaveBeenCalledWith('submission123');
      expect(submissionService.deleteSubmission).toHaveBeenCalledWith('submission123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Submission deleted successfully' });
    });

    it('should allow admin to delete any submission and return 200', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      const res = mockResponse();

      const accountId = 'admin123';
      const userId = 'user123';
      const mockSubmission = { id: 'submission123', user: { equals: jest.fn().mockReturnValue(false) } };
      const mockAccount = { id: accountId, role: 'admin' };

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest.spyOn(accountService, 'getUserIdByAccountId').mockResolvedValue(userId);
      (SubmissionModel.findById as jest.Mock).mockResolvedValue(mockSubmission);
      (AccountModel.findById as jest.Mock).mockResolvedValue(mockAccount);
      jest.spyOn(submissionService, 'deleteSubmission').mockResolvedValue(undefined);

      mockSubmission.user.equals.mockReturnValue(false);

      await deleteUserSubmission(req, res);

      expect(authUtils.getAccountId).toHaveBeenCalledWith(req);
      expect(accountService.getUserIdByAccountId).toHaveBeenCalledWith(accountId);
      expect(SubmissionModel.findById).toHaveBeenCalledWith('submission123');
      expect(AccountModel.findById).toHaveBeenCalledWith(accountId);
      expect(submissionService.deleteSubmission).toHaveBeenCalledWith('submission123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Submission deleted successfully' });
    });

    it('should deny deletion if user is not the owner and not admin, return 403', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      const res = mockResponse();

      const accountId = 'faculty123';
      const userId = 'user123';
      const mockSubmission = { id: 'submission123', user: { equals: jest.fn().mockReturnValue(false) } };
      const mockAccount = { id: accountId, role: 'Faculty member' };

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest.spyOn(accountService, 'getUserIdByAccountId').mockResolvedValue(userId);
      (SubmissionModel.findById as jest.Mock).mockResolvedValue(mockSubmission);
      (AccountModel.findById as jest.Mock).mockResolvedValue(mockAccount);

      mockSubmission.user.equals.mockReturnValue(false);

      await deleteUserSubmission(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'You do not have permission to delete this submission',
      });
    });

    it('should handle NotFoundError and return 404', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest.spyOn(accountService, 'getUserIdByAccountId').mockResolvedValue('user123');
      (SubmissionModel.findById as jest.Mock).mockResolvedValue(null);

      await deleteUserSubmission(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Submission not found' });
    });

    it('should handle MissingAuthorizationError and return 403', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest.spyOn(accountService, 'getUserIdByAccountId').mockResolvedValue('user123');
      (SubmissionModel.findById as jest.Mock).mockResolvedValue({
        id: 'submission123',
        user: { equals: jest.fn().mockReturnValue(false) },
      });
      (AccountModel.findById as jest.Mock).mockResolvedValue({ id: 'account123', role: 'student' });

      await deleteUserSubmission(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'You do not have permission to delete this submission',
      });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest.spyOn(accountService, 'getUserIdByAccountId').mockResolvedValue('user123');
      jest
        .spyOn(SubmissionModel, 'findById')
        .mockRejectedValue(new Error('Unexpected error'));

      await deleteUserSubmission(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete submission' });
    });
  });

  describe('getSubmissionByIdController', () => {
    it('should retrieve a submission by ID and return 200', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      const res = mockResponse();

      const accountId = 'account123';
      const userId = 'user123';
      const mockSubmission = {
        id: 'submission123',
        user: 'user123',
        equals: jest.fn().mockReturnValue(true),
        populate: jest.fn().mockResolvedValue({
          id: 'submission123',
          user: { id: 'user123' },
          assessment: { id: 'assessment123' },
        }),
      };

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest.spyOn(accountService, 'getUserIdByAccountId').mockResolvedValue(userId);
      (SubmissionModel.findById as jest.Mock).mockReturnValue(mockSubmission);

      await getSubmissionByIdController(req, res);

      expect(authUtils.getAccountId).toHaveBeenCalledWith(req);
      expect(accountService.getUserIdByAccountId).toHaveBeenCalledWith(accountId);
      expect(SubmissionModel.findById).toHaveBeenCalledWith('submission123');
      expect(mockSubmission.populate).toHaveBeenCalledWith('user');
      expect(mockSubmission.populate).toHaveBeenCalledWith('assessment');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        id: 'submission123',
        user: { id: 'user123' },
        assessment: { id: 'assessment123' },
      });
    });

    it('should allow admin to view any submission and return 200', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      const res = mockResponse();

      const accountId = 'admin123';
      const userId = 'user123';
      const mockSubmission = {
        id: 'submission123',
        user: 'user456',
        equals: jest.fn().mockReturnValue(false),
        populate: jest.fn().mockResolvedValue({
          id: 'submission123',
          user: { id: 'user456' },
          assessment: { id: 'assessment123' },
        }),
      };
      const mockAccount = { id: 'admin123', role: 'admin' };

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest.spyOn(accountService, 'getUserIdByAccountId').mockResolvedValue(userId);
      (SubmissionModel.findById as jest.Mock).mockReturnValue(mockSubmission);
      (AccountModel.findById as jest.Mock).mockResolvedValue(mockAccount);

      await getSubmissionByIdController(req, res);

      expect(mockSubmission.equals).toHaveBeenCalledWith('user123');
      expect(AccountModel.findById).toHaveBeenCalledWith(accountId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        id: 'submission123',
        user: { id: 'user456' },
        assessment: { id: 'assessment123' },
      });
    });

    it('should deny access if user is not the owner and not admin, return 403', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      const res = mockResponse();

      const accountId = 'faculty123';
      const userId = 'user123';
      const mockSubmission = {
        id: 'submission123',
        user: 'user456',
        equals: jest.fn().mockReturnValue(false),
        populate: jest.fn(),
      };
      const mockAccount = { id: 'faculty123', role: 'Faculty member' };

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest.spyOn(accountService, 'getUserIdByAccountId').mockResolvedValue(userId);
      (SubmissionModel.findById as jest.Mock).mockReturnValue(mockSubmission);
      (AccountModel.findById as jest.Mock).mockResolvedValue(mockAccount);

      await getSubmissionByIdController(req, res);

      expect(mockSubmission.equals).toHaveBeenCalledWith('user123');
      expect(AccountModel.findById).toHaveBeenCalledWith(accountId);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'You do not have permission to view this submission',
      });
    });

    it('should handle NotFoundError and return 404', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest.spyOn(accountService, 'getUserIdByAccountId').mockResolvedValue('user123');
      (SubmissionModel.findById as jest.Mock).mockResolvedValue(null);

      await getSubmissionByIdController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Submission not found' });
    });

    it('should handle MissingAuthorizationError and return 403', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest.spyOn(accountService, 'getUserIdByAccountId').mockResolvedValue('user123');
      (SubmissionModel.findById as jest.Mock).mockResolvedValue({
        id: 'submission123',
        user: 'user456',
        equals: jest.fn().mockReturnValue(false),
      });
      (AccountModel.findById as jest.Mock).mockResolvedValue({
        id: 'account123',
        role: 'student',
      });

      await getSubmissionByIdController(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'You do not have permission to view this submission',
      });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest.spyOn(accountService, 'getUserIdByAccountId').mockResolvedValue('user123');
      jest
        .spyOn(SubmissionModel, 'findById')
        .mockRejectedValue(new Error('Unexpected error'));

      await getSubmissionByIdController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to retrieve submission' });
    });
  });

  describe('adjustSubmissionScoreController', () => {
    it('should adjust submission score and return 200 for authorized user', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      req.body = { adjustedScore: 90 };
      const res = mockResponse();

      const accountId = 'faculty123';
      const mockAccount = { id: accountId, role: 'Faculty member' };
      const mockSubmission = { id: 'submission123', adjustedScore: 90 };

      (AccountModel.findById as jest.Mock).mockResolvedValue(mockAccount);
      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest.spyOn(submissionService, 'adjustSubmissionScore').mockResolvedValue(mockSubmission as any);

      await adjustSubmissionScoreController(req, res);

      expect(authUtils.getAccountId).toHaveBeenCalledWith(req);
      expect(AccountModel.findById).toHaveBeenCalledWith(accountId);
      expect(submissionService.adjustSubmissionScore).toHaveBeenCalledWith(
        'submission123',
        90
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Adjusted score submitted successfully.',
        submission: mockSubmission,
      });
    });

    it('should deny access if user is not authorized and return 403', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      req.body = { adjustedScore: 90 };
      const res = mockResponse();

      const accountId = 'student123';
      const mockAccount = { id: accountId, role: 'student' };

      (AccountModel.findById as jest.Mock).mockResolvedValue(mockAccount);
      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);

      await adjustSubmissionScoreController(req, res);

      expect(AccountModel.findById).toHaveBeenCalledWith(accountId);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'You do not have permission to adjust scores.',
      });
    });

    it('should handle BadRequestError for invalid adjusted score and return 400', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      req.body = { adjustedScore: -10 }; // Invalid score
      const res = mockResponse();

      const accountId = 'faculty123';
      const mockAccount = { id: accountId, role: 'Faculty member' };

      (AccountModel.findById as jest.Mock).mockResolvedValue(mockAccount);
      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);

      await adjustSubmissionScoreController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid adjusted score.' });
    });

    it('should handle NotFoundError and return 400', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      req.body = { adjustedScore: 90 };
      const res = mockResponse();

      const accountId = 'faculty123';
      const mockAccount = { id: accountId, role: 'Faculty member' };

      (AccountModel.findById as jest.Mock).mockResolvedValue(mockAccount);
      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest.spyOn(submissionService, 'adjustSubmissionScore').mockRejectedValue(
        new NotFoundError('Submission not found')
      );

      await adjustSubmissionScoreController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Submission not found' });
    });

    it('should handle MissingAuthorizationError and return 403', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      req.body = { adjustedScore: 90 };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('student123');

      await adjustSubmissionScoreController(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'You do not have permission to adjust scores.',
      });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      req.body = { adjustedScore: 90 };
      const res = mockResponse();

      const accountId = 'faculty123';
      const mockAccount = { id: accountId, role: 'Faculty member' };

      (AccountModel.findById as jest.Mock).mockResolvedValue(mockAccount);
      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest.spyOn(submissionService, 'adjustSubmissionScore').mockRejectedValue(
        new Error('Unexpected error')
      );

      await adjustSubmissionScoreController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to adjust submission score.' });
    });
  });
});
