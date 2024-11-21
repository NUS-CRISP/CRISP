/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import {
  getInternalAssessment,
  updateInternalAssessment,
  deleteInternalAssessment,
  addQuestionToAssessmentController,
  getQuestionsByAssessmentIdController,
  updateQuestionByIdController,
  deleteQuestionByIdController,
  releaseInternalAssessment,
  recallInternalAssessment,
} from '../../controllers/internalAssessmentController';
import * as internalAssessmentService from '../../services/internalAssessmentService';
import * as authUtils from '../../utils/auth';
import {
  BadRequestError,
  NotFoundError,
  MissingAuthorizationError,
} from '../../services/errors';

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

describe('internalAssessmentController', () => {
  describe('getInternalAssessment', () => {
    it('should retrieve an internal assessment and return 200', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      const accountId = 'account123';
      const mockAssessment = { id: 'assessment123', name: 'Test Assessment' };

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest
        .spyOn(internalAssessmentService, 'getInternalAssessmentById')
        .mockResolvedValue(mockAssessment as any);

      await getInternalAssessment(req, res);

      expect(authUtils.getAccountId).toHaveBeenCalledWith(req);
      expect(
        internalAssessmentService.getInternalAssessmentById
      ).toHaveBeenCalledWith('assessment123', accountId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockAssessment);
    });

    it('should handle NotFoundError and return 404', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'getInternalAssessmentById')
        .mockRejectedValue(new NotFoundError('Assessment not found'));

      await getInternalAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Assessment not found' });
    });

    it('should handle MissingAuthorizationError and return 400', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest
        .spyOn(authUtils, 'getAccountId')
        .mockRejectedValue(
          new MissingAuthorizationError('Missing Authorization')
        );

      await getInternalAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization' });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'getInternalAssessmentById')
        .mockRejectedValue(new Error('Some unexpected error'));

      await getInternalAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to retrieve assessment',
      });
    });
  });

  describe('updateInternalAssessment', () => {
    it('should update an internal assessment and return 200', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      req.body = { name: 'Updated Assessment' };
      const res = mockResponse();

      const accountId = 'account123';

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest
        .spyOn(internalAssessmentService, 'updateInternalAssessmentById')
        .mockResolvedValue(undefined as any);

      await updateInternalAssessment(req, res);

      expect(authUtils.getAccountId).toHaveBeenCalledWith(req);
      expect(
        internalAssessmentService.updateInternalAssessmentById
      ).toHaveBeenCalledWith('assessment123', accountId, {
        name: 'Updated Assessment',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Assessment updated successfully',
      });
    });

    it('should handle NotFoundError and return 404', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      req.body = { name: 'Updated Assessment' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'updateInternalAssessmentById')
        .mockRejectedValue(new NotFoundError('Assessment not found'));

      await updateInternalAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Assessment not found' });
    });

    it('should handle BadRequestError and return 400', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      req.body = { name: '' }; // Invalid name
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'updateInternalAssessmentById')
        .mockRejectedValue(new BadRequestError('Invalid data'));

      await updateInternalAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid data' });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      req.body = { name: 'Updated Assessment' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'updateInternalAssessmentById')
        .mockRejectedValue(new Error('Unexpected error'));

      await updateInternalAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to update assessment',
      });
    });
  });

  describe('deleteInternalAssessment', () => {
    it('should delete an internal assessment and return 200', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest
        .spyOn(internalAssessmentService, 'deleteInternalAssessmentById')
        .mockResolvedValue(undefined);

      await deleteInternalAssessment(req, res);

      expect(
        internalAssessmentService.deleteInternalAssessmentById
      ).toHaveBeenCalledWith('assessment123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Assessment deleted successfully',
      });
    });

    it('should handle NotFoundError and return 404', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest
        .spyOn(internalAssessmentService, 'deleteInternalAssessmentById')
        .mockRejectedValue(new NotFoundError('Assessment not found'));

      await deleteInternalAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Assessment not found' });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest
        .spyOn(internalAssessmentService, 'deleteInternalAssessmentById')
        .mockRejectedValue(new Error('Unexpected error'));

      await deleteInternalAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to delete assessment',
      });
    });
  });

  /*--------------------------Questions Controllers----------------------------*/

  describe('addQuestionToAssessmentController', () => {
    it('should add a question to an assessment and return 201', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      req.body = { questionText: 'What is your name?' };
      const res = mockResponse();

      const accountId = 'account123';
      const mockQuestion = {
        id: 'question123',
        questionText: 'What is your name?',
      };

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest
        .spyOn(internalAssessmentService, 'addQuestionToAssessment')
        .mockResolvedValue(mockQuestion as any);

      await addQuestionToAssessmentController(req, res);

      expect(authUtils.getAccountId).toHaveBeenCalledWith(req);
      expect(
        internalAssessmentService.addQuestionToAssessment
      ).toHaveBeenCalledWith(
        'assessment123',
        { questionText: 'What is your name?' },
        accountId
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockQuestion);
    });

    it('should handle NotFoundError and return 404', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      req.body = { questionText: 'What is your name?' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'addQuestionToAssessment')
        .mockRejectedValue(new NotFoundError('Assessment not found'));

      await addQuestionToAssessmentController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Assessment not found' });
    });

    it('should handle BadRequestError and return 400', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      req.body = { questionText: '' }; // Invalid question text
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'addQuestionToAssessment')
        .mockRejectedValue(new BadRequestError('Invalid question data'));

      await addQuestionToAssessmentController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid question data' });
    });

    it('should handle MissingAuthorizationError and return 401', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      req.body = { questionText: 'What is your name?' };
      const res = mockResponse();

      jest
        .spyOn(authUtils, 'getAccountId')
        .mockRejectedValue(
          new MissingAuthorizationError('Missing Authorization')
        );

      await addQuestionToAssessmentController(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization' });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      req.body = { questionText: 'What is your name?' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'addQuestionToAssessment')
        .mockRejectedValue(new Error('Unexpected error'));

      await addQuestionToAssessmentController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to add question',
      });
    });
  });

  describe('getQuestionsByAssessmentIdController', () => {
    it('should retrieve questions by assessment ID and return 200', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      const accountId = 'account123';
      const mockQuestions = [
        { id: 'question1', questionText: 'Question 1' },
        { id: 'question2', questionText: 'Question 2' },
      ];

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest
        .spyOn(internalAssessmentService, 'getQuestionsByAssessmentId')
        .mockResolvedValue(mockQuestions as any);

      await getQuestionsByAssessmentIdController(req, res);

      expect(authUtils.getAccountId).toHaveBeenCalledWith(req);
      expect(
        internalAssessmentService.getQuestionsByAssessmentId
      ).toHaveBeenCalledWith('assessment123', accountId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockQuestions);
    });

    it('should handle NotFoundError and return 404', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'getQuestionsByAssessmentId')
        .mockRejectedValue(new NotFoundError('Questions not found'));

      await getQuestionsByAssessmentIdController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Questions not found' });
    });

    it('should handle MissingAuthorizationError and return 401', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest
        .spyOn(authUtils, 'getAccountId')
        .mockRejectedValue(
          new MissingAuthorizationError('Missing Authorization')
        );

      await getQuestionsByAssessmentIdController(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization' });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'getQuestionsByAssessmentId')
        .mockRejectedValue(new Error('Unexpected error'));

      await getQuestionsByAssessmentIdController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to retrieve questions',
      });
    });
  });

  describe('updateQuestionByIdController', () => {
    it('should update a question by ID and return 200', async () => {
      const req = mockRequest();
      req.params = { questionId: 'question123' };
      req.body = { questionText: 'Updated Question' };
      const res = mockResponse();

      const accountId = 'account123';
      const mockUpdatedQuestion = {
        id: 'question123',
        questionText: 'Updated Question',
      };

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest
        .spyOn(internalAssessmentService, 'updateQuestionById')
        .mockResolvedValue(mockUpdatedQuestion as any);

      await updateQuestionByIdController(req, res);

      expect(authUtils.getAccountId).toHaveBeenCalledWith(req);
      expect(internalAssessmentService.updateQuestionById).toHaveBeenCalledWith(
        'question123',
        { questionText: 'Updated Question' },
        accountId
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUpdatedQuestion);
    });

    it('should handle NotFoundError and return 404', async () => {
      const req = mockRequest();
      req.params = { questionId: 'question123' };
      req.body = { questionText: 'Updated Question' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'updateQuestionById')
        .mockRejectedValue(new NotFoundError('Question not found'));

      await updateQuestionByIdController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Question not found' });
    });

    it('should handle BadRequestError and return 400', async () => {
      const req = mockRequest();
      req.params = { questionId: 'question123' };
      req.body = { questionText: '' }; // Invalid question text
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'updateQuestionById')
        .mockRejectedValue(new BadRequestError('Invalid question data'));

      await updateQuestionByIdController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid question data' });
    });

    it('should handle MissingAuthorizationError and return 401', async () => {
      const req = mockRequest();
      req.params = { questionId: 'question123' };
      req.body = { questionText: 'Updated Question' };
      const res = mockResponse();

      jest
        .spyOn(authUtils, 'getAccountId')
        .mockRejectedValue(
          new MissingAuthorizationError('Missing Authorization')
        );

      await updateQuestionByIdController(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization' });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { questionId: 'question123' };
      req.body = { questionText: 'Updated Question' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'updateQuestionById')
        .mockRejectedValue(new Error('Unexpected error'));

      await updateQuestionByIdController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to update question',
      });
    });
  });

  describe('deleteQuestionByIdController', () => {
    it('should delete a question by ID and return 204', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123', questionId: 'question123' };
      const res = mockResponse();

      const accountId = 'account123';

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest
        .spyOn(internalAssessmentService, 'deleteQuestionById')
        .mockResolvedValue(undefined);

      await deleteQuestionByIdController(req, res);

      expect(authUtils.getAccountId).toHaveBeenCalledWith(req);
      expect(internalAssessmentService.deleteQuestionById).toHaveBeenCalledWith(
        'assessment123',
        'question123',
        accountId
      );
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('should handle NotFoundError and return 404', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123', questionId: 'question123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'deleteQuestionById')
        .mockRejectedValue(new NotFoundError('Question not found'));

      await deleteQuestionByIdController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Question not found' });
    });

    it('should handle BadRequestError and return 400', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123', questionId: 'question123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'deleteQuestionById')
        .mockRejectedValue(new BadRequestError('Invalid request'));

      await deleteQuestionByIdController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid request' });
    });

    it('should handle MissingAuthorizationError and return 401', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123', questionId: 'question123' };
      const res = mockResponse();

      jest
        .spyOn(authUtils, 'getAccountId')
        .mockRejectedValue(
          new MissingAuthorizationError('Missing Authorization')
        );

      await deleteQuestionByIdController(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization' });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123', questionId: 'question123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'deleteQuestionById')
        .mockRejectedValue(new Error('Unexpected error'));

      await deleteQuestionByIdController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to delete question',
      });
    });
  });

  /*--------------------------Release-Form Controllers----------------------------*/

  describe('releaseInternalAssessment', () => {
    it('should release an internal assessment and return 200', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      const accountId = 'account123';

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest
        .spyOn(internalAssessmentService, 'releaseInternalAssessmentById')
        .mockResolvedValue(undefined as any);

      await releaseInternalAssessment(req, res);

      expect(authUtils.getAccountId).toHaveBeenCalledWith(req);
      expect(
        internalAssessmentService.releaseInternalAssessmentById
      ).toHaveBeenCalledWith('assessment123', accountId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Assessment released successfully',
      });
    });

    it('should handle NotFoundError and return 404', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'releaseInternalAssessmentById')
        .mockRejectedValue(new NotFoundError('Assessment not found'));

      await releaseInternalAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Assessment not found' });
    });

    it('should handle BadRequestError and return 400', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'releaseInternalAssessmentById')
        .mockRejectedValue(new BadRequestError('Invalid data'));

      await releaseInternalAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid data' });
    });

    it('should handle MissingAuthorizationError and return 401', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest
        .spyOn(authUtils, 'getAccountId')
        .mockRejectedValue(
          new MissingAuthorizationError('Missing Authorization')
        );

      await releaseInternalAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization' });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'releaseInternalAssessmentById')
        .mockRejectedValue(new Error('Unexpected error'));

      await releaseInternalAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to release assessment',
      });
    });
  });

  describe('recallInternalAssessment', () => {
    it('should recall an internal assessment and return 200', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      const accountId = 'account123';

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest
        .spyOn(internalAssessmentService, 'recallInternalAssessmentById')
        .mockResolvedValue(undefined as any);

      await recallInternalAssessment(req, res);

      expect(authUtils.getAccountId).toHaveBeenCalledWith(req);
      expect(
        internalAssessmentService.recallInternalAssessmentById
      ).toHaveBeenCalledWith('assessment123', accountId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Assessment recalled successfully',
      });
    });

    it('should handle NotFoundError and return 404', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'recallInternalAssessmentById')
        .mockRejectedValue(new NotFoundError('Assessment not found'));

      await recallInternalAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Assessment not found' });
    });

    it('should handle BadRequestError and return 400', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'recallInternalAssessmentById')
        .mockRejectedValue(new BadRequestError('Invalid data'));

      await recallInternalAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid data' });
    });

    it('should handle MissingAuthorizationError and return 401', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest
        .spyOn(authUtils, 'getAccountId')
        .mockRejectedValue(
          new MissingAuthorizationError('Missing Authorization')
        );

      await recallInternalAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization' });
    });

    it('should handle unexpected errors and return 500', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'recallInternalAssessmentById')
        .mockRejectedValue(new Error('Unexpected error'));

      await recallInternalAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to recall assessment',
      });
    });
  });
});
