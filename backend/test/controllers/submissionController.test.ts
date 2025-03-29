/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import {
  submitAssessment,
  getUserSubmissions,
  getAllSubmissions,
  deleteUserSubmission,
  getSubmissionByIdController,
  adjustSubmissionScoreController,
  bulkDeleteSubmissionsByAssessment,
} from '../../controllers/submissionController';
import * as submissionService from '../../services/submissionService';
import * as authUtils from '../../utils/auth';
import * as accountService from '../../services/accountService';
import AccountModel from '../../models/Account';
import SubmissionModel from '../../models/Submission';
import {
  NotFoundError,
  MissingAuthorizationError,
} from '../../services/errors';
import CrispRole from '@shared/types/auth/CrispRole';

jest.mock('../../services/submissionService');
jest.mock('../../utils/auth');
jest.mock('../../services/accountService');
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
  req.headers = {};
  return req;
};

const mockResponse = () => {
  const res = {
    setHeader: jest.fn(),
  } as unknown as Response;
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
        answers: [{ questionId: 'q1', answer: 'A' }],
        isDraft: false,
      };
      const res = mockResponse();

      const accountId = 'account123';
      const userId = 'user123';
      const mockSubmission = { id: 'submission123', ...req.body };

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest
        .spyOn(accountService, 'getUserIdByAccountId')
        .mockResolvedValue(userId);
      jest
        .spyOn(submissionService, 'createSubmission')
        .mockResolvedValue(mockSubmission as any);

      await submitAssessment(req, res);

      expect(authUtils.getAccountId).toHaveBeenCalledWith(req);
      expect(accountService.getUserIdByAccountId).toHaveBeenCalledWith(
        accountId
      );
      expect(submissionService.createSubmission).toHaveBeenCalledWith(
        'assessment123',
        userId,
        req.body.answers,
        req.body.isDraft
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Submission saved successfully',
        submission: mockSubmission,
      });
    });

    it('should update an existing submission and return 200', async () => {
      const req = mockRequest();
      req.body = {
        answers: [{ questionId: 'q1', answer: 'A' }],
        isDraft: false,
        submissionId: 'submission123',
      };
      const res = mockResponse();

      const accountId = 'account123';
      const userId = 'user123';
      const mockSubmission = { id: 'submission123', ...req.body };

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest
        .spyOn(accountService, 'getUserIdByAccountId')
        .mockResolvedValue(userId);
      jest
        .spyOn(submissionService, 'updateSubmission')
        .mockResolvedValue(mockSubmission as any);

      await submitAssessment(req, res);

      expect(authUtils.getAccountId).toHaveBeenCalledWith(req);
      expect(accountService.getUserIdByAccountId).toHaveBeenCalledWith(
        accountId
      );
      expect(submissionService.updateSubmission).toHaveBeenCalledWith(
        'submission123',
        userId,
        accountId,
        req.body.answers,
        req.body.isDraft
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Submission saved successfully',
        submission: mockSubmission,
      });
    });

    it('should handle BadRequestError when answers are invalid', async () => {
      const req = mockRequest();
      req.body = { answers: 'invalid answers' }; // Not an array
      const res = mockResponse();

      await submitAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid answers data' });
    });

    it('should handle NotFoundError and return 400', async () => {
      const req = mockRequest();
      req.body = {
        answers: [{ questionId: 'q1', answer: 'A' }],
        isDraft: false,
      };
      const res = mockResponse();

      jest
        .spyOn(authUtils, 'getAccountId')
        .mockRejectedValue(new NotFoundError('Not found'));

      await submitAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not found' });
    });

    it('should handle MissingAuthorizationError and return 401', async () => {
      const req = mockRequest();
      req.body = {
        answers: [{ questionId: 'q1', answer: 'A' }],
        isDraft: false,
      };
      const res = mockResponse();

      jest
        .spyOn(authUtils, 'getAccountId')
        .mockRejectedValue(new MissingAuthorizationError('Unauthorized'));

      await submitAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.body = {
        answers: [{ questionId: 'q1', answer: 'A' }],
        isDraft: false,
      };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(accountService, 'getUserIdByAccountId')
        .mockRejectedValue(new Error('Unexpected error'));

      await submitAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to submit assessment',
      });
    });
  });

  describe('getUserSubmissions', () => {
    it('should retrieve user submissions and return 200', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      const accountId = 'account123';
      const userId = 'user123';
      const mockSubmissions = [{ id: 'submission123' }];
      const account = {};

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest
        .spyOn(accountService, 'getUserIdByAccountId')
        .mockResolvedValue(userId);
      jest
        .spyOn(submissionService, 'getSubmissionsByAssessmentAndUser')
        .mockResolvedValue(mockSubmissions as any);
      jest.spyOn(AccountModel, 'findById').mockResolvedValue(account);

      await getUserSubmissions(req, res);

      expect(authUtils.getAccountId).toHaveBeenCalledWith(req);
      expect(accountService.getUserIdByAccountId).toHaveBeenCalledWith(
        accountId
      );
      expect(
        submissionService.getSubmissionsByAssessmentAndUser
      ).toHaveBeenCalledWith('assessment123', userId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockSubmissions);
    });

    it('should handle NotFoundError and return 404', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(accountService, 'getUserIdByAccountId')
        .mockRejectedValue(new NotFoundError('User not found'));

      await getUserSubmissions(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should handle MissingAuthorizationError from no matching account ID and return 401', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('accountId');
      jest.spyOn(AccountModel, 'findById').mockResolvedValue(null);

      await getUserSubmissions(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle MissingAuthorizationError and return 401', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest
        .spyOn(authUtils, 'getAccountId')
        .mockRejectedValue(new MissingAuthorizationError('Unauthorized'));

      await getUserSubmissions(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(AccountModel, 'findById')
        .mockRejectedValue(new Error('Unexpected error'));

      await getUserSubmissions(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to retrieve submissions',
      });
    });
  });

  describe('getAllSubmissions', () => {
    it('should retrieve all submissions and return 200', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      const accountId = 'account123';
      const account = { id: accountId, crispRole: CrispRole.Admin };
      const mockSubmissions = [{ id: 'submission123' }];

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      (AccountModel.findById as jest.Mock).mockResolvedValue(account);
      jest
        .spyOn(submissionService, 'getSubmissionsByAssessment')
        .mockResolvedValue(mockSubmissions as any);

      await getAllSubmissions(req, res);

      expect(AccountModel.findById).toHaveBeenCalledWith(accountId);
      expect(submissionService.getSubmissionsByAssessment).toHaveBeenCalledWith(
        'assessment123'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockSubmissions);
    });

    // it('should retrieve all submissions for TAs and return 200 with scores hidden', async () => {
    //   const req = mockRequest();
    //   req.params = { assessmentId: 'assessment123' };
    //   const res = mockResponse();

    //   const accountId = 'account123';
    //   const account = { id: accountId, crispRole: CrispRole.Normal };
    //   const mockSubmissions = [
    //     { id: 'submission123', score: 69, adjustedScore: 420 },
    //   ];
    //   const mockResolvedSubmissions = [
    //     { id: 'submission123', score: -1, adjustedScore: -1 },
    //   ];

    //   jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
    //   (AccountModel.findById as jest.Mock).mockResolvedValue(account);
    //   jest
    //     .spyOn(submissionService, 'getSubmissionsByAssessment')
    //     .mockResolvedValue(mockSubmissions as any);

    //   await getAllSubmissions(req, res);

    //   expect(AccountModel.findById).toHaveBeenCalledWith(accountId);
    //   expect(submissionService.getSubmissionsByAssessment).toHaveBeenCalledWith(
    //     'assessment123'
    //   );
    //   expect(res.status).toHaveBeenCalledWith(200);
    //   expect(res.json).toHaveBeenCalledWith(mockResolvedSubmissions);
    // });

    it('should handle MissingAuthorizationError and return 403', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      const accountId = 'account123';
      const account = { id: accountId, crispRole: CrispRole.Normal };

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      (AccountModel.findById as jest.Mock).mockResolvedValue(account);

      await getAllSubmissions(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access denied' });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest
        .spyOn(authUtils, 'getAccountId')
        .mockRejectedValue(new Error('Error'));

      await getAllSubmissions(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to retrieve submissions',
      });
    });
  });

  describe('deleteUserSubmission', () => {
    it('should delete a user submission and return 200', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      const res = mockResponse();

      const accountId = 'account123';
      const userId = 'user123';
      const submission = { id: 'submission123', user: { equals: jest.fn() } };

      submission.user.equals.mockReturnValue(true);

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest
        .spyOn(accountService, 'getUserIdByAccountId')
        .mockResolvedValue(userId);
      (SubmissionModel.findById as jest.Mock).mockResolvedValue(submission);
      jest
        .spyOn(submissionService, 'deleteSubmission')
        .mockResolvedValue(undefined);

      await deleteUserSubmission(req, res);

      expect(SubmissionModel.findById).toHaveBeenCalledWith('submission123');
      expect(submissionService.deleteSubmission).toHaveBeenCalledWith(
        'user123',
        'submission123'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Submission deleted successfully',
      });
    });

    it('should handle NotFoundError and return 404', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      (SubmissionModel.findById as jest.Mock).mockResolvedValue(null);

      await deleteUserSubmission(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Submission not found' });
    });

    it('should handle MissingAuthorizationError and return 403', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      const res = mockResponse();

      const accountId = 'account123';
      const submission = { id: 'submission123', user: { equals: jest.fn() } };
      const account = { id: accountId, crispRole: CrispRole.Normal };

      submission.user.equals.mockReturnValue(false);

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      (SubmissionModel.findById as jest.Mock).mockResolvedValue(submission);
      (AccountModel.findById as jest.Mock).mockResolvedValue(account);

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

      jest
        .spyOn(authUtils, 'getAccountId')
        .mockRejectedValue(new Error('Unexpected error'));

      await deleteUserSubmission(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to delete submission',
      });
    });
  });

  describe('getSubmissionByIdController', () => {
    it('should retrieve a submission by ID and return 200', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      const res = mockResponse();

      const accountId = 'account123';
      const userId = 'user123';
      const submission = {
        id: 'submission123',
        user: { equals: jest.fn() },
        populate: jest.fn().mockReturnThis(),
      };

      submission.user.equals.mockReturnValue(true);

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest
        .spyOn(accountService, 'getUserIdByAccountId')
        .mockResolvedValue(userId);
      (SubmissionModel.findById as jest.Mock).mockReturnValue(submission);

      await getSubmissionByIdController(req, res);

      expect(SubmissionModel.findById).toHaveBeenCalledWith('submission123');
      expect(submission.populate).toHaveBeenCalledWith('user');
      expect(submission.populate).toHaveBeenCalledWith('assessment');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(submission);
    });

    it('should handle missing submission from invalid submissionId and return 404', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      const res = mockResponse();

      const accountId = 'account123';
      const userId = 'user123';

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest
        .spyOn(accountService, 'getUserIdByAccountId')
        .mockResolvedValue(userId);
      (SubmissionModel.findById as jest.Mock).mockImplementation(() => ({
        // The first .populate() call returns an object with another .populate()
        populate: jest.fn().mockImplementation(() => ({
          // The second .populate() call finally resolves to the "mockSubmission"
          populate: jest.fn().mockResolvedValue(undefined),
        })),
      }));

      await getSubmissionByIdController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Submission not found' });
    });

    it('should handle NotFoundError and return 404', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      const res = mockResponse();

      const accountId = 'account123';
      const userId = 'user123';

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest
        .spyOn(accountService, 'getUserIdByAccountId')
        .mockResolvedValue(userId);

      (SubmissionModel.findById as jest.Mock).mockImplementation(() => {
        throw new NotFoundError('Submission not found');
      });

      await getSubmissionByIdController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Submission not found' });
    });

    it('should handle MissingAuthorizationError and return 403', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      const res = mockResponse();

      const accountId = 'account123';
      const userId = 'user123';
      const submission = {
        id: 'submission123',
        user: { equals: jest.fn() },
        populate: jest.fn().mockReturnThis(),
      };
      const account = { id: accountId, crispRole: CrispRole.Normal };

      submission.user.equals.mockReturnValue(false);

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest
        .spyOn(accountService, 'getUserIdByAccountId')
        .mockResolvedValue(userId);
      (SubmissionModel.findById as jest.Mock).mockReturnValue(submission);
      (AccountModel.findById as jest.Mock).mockResolvedValue(account);

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

      jest
        .spyOn(authUtils, 'getAccountId')
        .mockRejectedValue(new Error('Unexpected error'));

      await getSubmissionByIdController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to retrieve submission',
      });
    });
  });

  describe('adjustSubmissionScoreController', () => {
    it('should adjust submission score and return 200', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      req.body = { adjustedScore: 90 };
      const res = mockResponse();

      const accountId = 'account123';
      const account = { id: accountId, crispRole: CrispRole.Faculty };
      const submission = { id: 'submission123', adjustedScore: 90 };

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      (AccountModel.findById as jest.Mock).mockResolvedValue(account);
      jest
        .spyOn(submissionService, 'adjustSubmissionScore')
        .mockResolvedValue(submission as any);

      await adjustSubmissionScoreController(req, res);

      expect(AccountModel.findById).toHaveBeenCalledWith(accountId);
      expect(submissionService.adjustSubmissionScore).toHaveBeenCalledWith(
        'submission123',
        90
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Adjusted score submitted successfully.',
        submission,
      });
    });

    it('should handle BadRequestError when adjustedScore is invalid', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      req.body = { adjustedScore: -10 };
      const res = mockResponse();

      const accountId = 'account123';
      const account = { id: accountId, crispRole: CrispRole.Faculty };

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      (AccountModel.findById as jest.Mock).mockResolvedValue(account);

      await adjustSubmissionScoreController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid adjusted score.',
      });
    });

    it('should handle MissingAuthorizationError and return 403', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      req.body = { adjustedScore: 90 };
      const res = mockResponse();

      const accountId = 'account123';
      const account = { id: accountId, crispRole: CrispRole.Normal };

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      (AccountModel.findById as jest.Mock).mockResolvedValue(account);

      await adjustSubmissionScoreController(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'You do not have permission to adjust scores.',
      });
    });

    it('should handle NotFoundError and return 400', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      req.body = { adjustedScore: 90 };
      const res = mockResponse();

      const accountId = 'account123';
      const account = { id: accountId, crispRole: CrispRole.Faculty };

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      (AccountModel.findById as jest.Mock).mockResolvedValue(account);
      jest
        .spyOn(submissionService, 'adjustSubmissionScore')
        .mockRejectedValue(new NotFoundError('Submission not found'));

      await adjustSubmissionScoreController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Submission not found' });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { submissionId: 'submission123' };
      req.body = { adjustedScore: 90 };
      const res = mockResponse();

      const accountId = 'account123';
      const account = { id: accountId, crispRole: CrispRole.Faculty };

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      (AccountModel.findById as jest.Mock).mockResolvedValue(account);
      jest
        .spyOn(submissionService, 'adjustSubmissionScore')
        .mockRejectedValue(new Error('Unexpected error'));

      await adjustSubmissionScoreController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to adjust submission score.',
      });
    });
  });

  describe('bulkDeleteSubmissionsByAssessment', () => {
    it('should soft-delete all submissions for an assessment and return 200', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessmentABC' };
      const res = mockResponse();

      const accountId = 'account123';
      const account = { id: accountId, crispRole: CrispRole.Faculty }; // or 'admin'
      const userId = 'user123';
      const mockDeletedCount = 5;

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      (AccountModel.findById as jest.Mock).mockResolvedValue(account);
      jest
        .spyOn(accountService, 'getUserIdByAccountId')
        .mockResolvedValue(userId);
      (
        submissionService.softDeleteSubmissionsByAssessmentId as jest.Mock
      ).mockResolvedValue(mockDeletedCount);

      await bulkDeleteSubmissionsByAssessment(req, res);

      expect(authUtils.getAccountId).toHaveBeenCalledWith(req);
      expect(AccountModel.findById).toHaveBeenCalledWith(accountId);
      expect(accountService.getUserIdByAccountId).toHaveBeenCalledWith(
        accountId
      );
      expect(
        submissionService.softDeleteSubmissionsByAssessmentId
      ).toHaveBeenCalledWith(userId, 'assessmentABC');

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: `Successfully soft-deleted ${mockDeletedCount} submission(s) for Assessment assessmentABC.`,
        deletedCount: mockDeletedCount,
      });
    });

    it('should handle NotFoundError or BadRequestError and return 404', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessmentABC' };
      const res = mockResponse();

      const accountId = 'account123';
      const account = { id: accountId, crispRole: CrispRole.Faculty };

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      (AccountModel.findById as jest.Mock).mockResolvedValue(account);
      jest
        .spyOn(accountService, 'getUserIdByAccountId')
        .mockResolvedValue('user123');
      (
        submissionService.softDeleteSubmissionsByAssessmentId as jest.Mock
      ).mockRejectedValue(new NotFoundError('Assessment not found'));

      await bulkDeleteSubmissionsByAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Assessment not found' });
    });

    it('should handle MissingAuthorizationError if user is not admin/faculty and return 403', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessmentABC' };
      const res = mockResponse();

      const accountId = 'account123';
      const account = { id: accountId, crispRole: CrispRole.Normal }; // Not admin/faculty

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      (AccountModel.findById as jest.Mock).mockResolvedValue(account);

      await bulkDeleteSubmissionsByAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'You do not have permission to perform this action.',
      });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessmentABC' };
      const res = mockResponse();

      const accountId = 'account123';
      const account = { id: accountId, crispRole: CrispRole.Faculty };

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      (AccountModel.findById as jest.Mock).mockResolvedValue(account);
      jest
        .spyOn(accountService, 'getUserIdByAccountId')
        .mockResolvedValue('user123');
      (
        submissionService.softDeleteSubmissionsByAssessmentId as jest.Mock
      ).mockRejectedValue(new Error('Unexpected error'));

      await bulkDeleteSubmissionsByAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to bulk delete submissions.',
      });
    });
  });
});
