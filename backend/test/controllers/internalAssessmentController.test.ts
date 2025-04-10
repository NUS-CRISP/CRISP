/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import {
  getInternalAssessment,
  updateInternalAssessment,
  deleteInternalAssessment,
  addQuestionToAssessmentController,
  addQuestionsToAssessmentController,
  getQuestionsByAssessmentIdController,
  updateQuestionByIdController,
  deleteQuestionByIdController,
  releaseInternalAssessment,
  recallInternalAssessment,
  reorderQuestionsInInternalAssessment,
  gatherComments,
} from '../../controllers/internalAssessmentController';
import * as internalAssessmentService from '../../services/internalAssessmentService';
import * as authUtils from '../../utils/auth';
import {
  BadRequestError,
  NotFoundError,
  MissingAuthorizationError,
} from '../../services/errors';
import AccountModel from '@models/Account';
import CrispRole from '@shared/types/auth/CrispRole';
import { getSubmissionsByAssessment } from '../../services/submissionService';
import UserModel from '@models/User';

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
  const res = {
    setHeader: jest.fn(),
  } as unknown as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
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
      req.body = {
        text: 'What is your name?',
        type: 'Short Response Question',
        shortResponsePlaceholder: 'Hello',
      };
      const res = mockResponse();

      const accountId = 'account123';
      const mockQuestion = {
        id: 'question123',
        text: 'What is your name?',
        type: 'Short Response Question',
        shortResponsePlaceholder: 'Hello',
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
        {
          text: 'What is your name?',
          type: 'Short Response Question',
          shortResponsePlaceholder: 'Hello',
        },
        accountId
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockQuestion);
    });

    it('should handle NotFoundError and return 404', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      req.body = {
        text: 'What is your name?',
        type: 'Short Response Question',
        shortResponsePlaceholder: 'Hello',
      };
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
      req.body = {
        text: '',
        type: 'Short Response Question',
        shortResponsePlaceholder: 'Hello',
      }; // Invalid question text
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
      req.body = {
        text: 'What is your name?',
        type: 'Short Response Question',
        shortResponsePlaceholder: 'Hello',
      };
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
      req.body = {
        text: 'What is your name?',
        type: 'Short Response Question',
        shortResponsePlaceholder: 'Hello',
      };
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

  describe('addQuestionsToAssessmentController', () => {
    it('should add multiple questions to an assessment and return 201', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessmentMultiple123' };
      req.body = {
        items: [
          { text: 'Q1', type: 'Short Response Question' },
          { text: 'Q2', type: 'Long Response Question' },
        ],
      };
      const res = mockResponse();

      const accountId = 'account123';
      const mockQuestion1 = { id: 'question1', text: 'Q1' };
      const mockQuestion2 = { id: 'question2', text: 'Q2' };

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      const addQuestionSpy = jest
        .spyOn(internalAssessmentService, 'addQuestionToAssessment')
        .mockResolvedValueOnce(mockQuestion1 as any)
        .mockResolvedValueOnce(mockQuestion2 as any);

      await addQuestionsToAssessmentController(req, res);

      expect(authUtils.getAccountId).toHaveBeenCalledWith(req);
      expect(addQuestionSpy).toHaveBeenCalledTimes(2);
      expect(addQuestionSpy).toHaveBeenNthCalledWith(
        1,
        'assessmentMultiple123',
        { text: 'Q1', type: 'Short Response Question' },
        accountId
      );
      expect(addQuestionSpy).toHaveBeenNthCalledWith(
        2,
        'assessmentMultiple123',
        { text: 'Q2', type: 'Long Response Question' },
        accountId
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith([mockQuestion1, mockQuestion2]);
    });

    it('should handle NotFoundError in addQuestionsToAssessmentController and return 404', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessmentMultiple123' };
      req.body = {
        items: [{ text: 'Q1', type: 'Short Response Question' }],
      };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'addQuestionToAssessment')
        .mockRejectedValueOnce(new NotFoundError('Assessment not found'));

      await addQuestionsToAssessmentController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Assessment not found' });
    });

    it('should handle BadRequestError in addQuestionsToAssessmentController and return 400', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessmentMultiple123' };
      req.body = {
        items: [{ text: '', type: 'Short Response Question' }], // invalid
      };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'addQuestionToAssessment')
        .mockRejectedValue(new BadRequestError('Invalid data'));

      await addQuestionsToAssessmentController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid data' });
    });

    it('should handle MissingAuthorizationError in addQuestionsToAssessmentController and return 401', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessmentMultiple123' };
      req.body = {
        items: [{ text: 'Q1', type: 'Short Response Question' }],
      };
      const res = mockResponse();

      jest
        .spyOn(authUtils, 'getAccountId')
        .mockRejectedValue(
          new MissingAuthorizationError('Missing Authorization')
        );

      await addQuestionsToAssessmentController(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization' });
    });

    it('should handle unexpected errors in addQuestionsToAssessmentController and return 500', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessmentMultiple123' };
      req.body = {
        items: [{ text: 'Q1', type: 'Short Response Question' }],
      };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'addQuestionToAssessment')
        .mockRejectedValue(new Error('Unexpected error'));

      await addQuestionsToAssessmentController(req, res);

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
        {
          id: 'question1',
          text: 'Question 1',
          type: 'Short Response Question',
          shortResponsePlaceholder: 'Hello',
        },
        {
          id: 'question2',
          text: 'Question 2',
          type: 'Short Response Question',
          shortResponsePlaceholder: 'Hello',
        },
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
      req.body = {
        text: 'Updated Question',
        type: 'Short Response Question',
        shortResponsePlaceholder: 'Hello',
      };
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
        {
          text: 'Updated Question',
          shortResponsePlaceholder: 'Hello',
          type: 'Short Response Question',
        },
        accountId
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUpdatedQuestion);
    });

    it('should handle NotFoundError and return 404', async () => {
      const req = mockRequest();
      req.params = { questionId: 'question123' };
      req.body = {
        text: 'Updated Question',
        type: 'Short Response Question',
        shortResponsePlaceholder: 'Hello',
      };
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
      req.body = {
        text: '',
        type: 'Short Response Question',
        shortResponsePlaceholder: 'Hello',
      }; // Invalid question text
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
      req.body = {
        text: 'Updated Question',
        type: 'Short Response Question',
        shortResponsePlaceholder: 'Hello',
      };
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
      req.body = {
        text: 'Updated Question',
        type: 'Short Response Question',
        shortResponsePlaceholder: 'Hello',
      };
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
    it('should release an internal assessment, recalc submissions, and return 200', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessment123' };
      const res = mockResponse();

      const accountId = 'account123';

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      jest
        .spyOn(internalAssessmentService, 'releaseInternalAssessmentById')
        .mockResolvedValue(undefined as any);

      // Also mock recaluculateSubmissionsForAssessment
      const recalcSpy = jest
        .spyOn(
          internalAssessmentService,
          'recaluculateSubmissionsForAssessment'
        )
        .mockResolvedValue(undefined as any);

      await releaseInternalAssessment(req, res);

      expect(authUtils.getAccountId).toHaveBeenCalledWith(req);
      expect(
        internalAssessmentService.releaseInternalAssessmentById
      ).toHaveBeenCalledWith('assessment123', accountId);

      // Ensure that recalculation was called
      expect(recalcSpy).toHaveBeenCalledWith('assessment123', accountId);

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

  // NEW: Test for reorderQuestionsInInternalAssessment
  describe('reorderQuestionsInInternalAssessment', () => {
    it('should reorder questions and return 200', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessmentReorder123' };
      req.body = { items: ['q1', 'q2', 'q3'] };
      const res = mockResponse();

      const accountId = 'account123';

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue(accountId);
      const reorderSpy = jest
        .spyOn(internalAssessmentService, 'reorderQuestions')
        .mockResolvedValue(undefined as any);

      await reorderQuestionsInInternalAssessment(req, res);

      expect(authUtils.getAccountId).toHaveBeenCalledWith(req);
      expect(reorderSpy).toHaveBeenCalledWith(
        'assessmentReorder123',
        ['q1', 'q2', 'q3'],
        accountId
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Questions reordered successfully',
      });
    });

    it('should handle NotFoundError and return 404 (reorder)', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessmentReorder123' };
      req.body = { items: ['q1', 'q2'] };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'reorderQuestions')
        .mockRejectedValue(new NotFoundError('Assessment not found'));

      await reorderQuestionsInInternalAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Assessment not found' });
    });

    it('should handle BadRequestError and return 400 (reorder)', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessmentReorder123' };
      req.body = { items: [] }; // Possibly invalid if user can't reorder
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'reorderQuestions')
        .mockRejectedValue(new BadRequestError('Invalid reorder data'));

      await reorderQuestionsInInternalAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid reorder data' });
    });

    it('should handle MissingAuthorizationError and return 401 (reorder)', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessmentReorder123' };
      req.body = { items: ['q1'] };
      const res = mockResponse();

      jest
        .spyOn(authUtils, 'getAccountId')
        .mockRejectedValue(
          new MissingAuthorizationError('Missing Authorization')
        );

      await reorderQuestionsInInternalAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization' });
    });

    it('should handle unexpected errors and return 500 (reorder)', async () => {
      const req = mockRequest();
      req.params = { assessmentId: 'assessmentReorder123' };
      req.body = { items: ['q1'] };
      const res = mockResponse();

      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account123');
      jest
        .spyOn(internalAssessmentService, 'reorderQuestions')
        .mockRejectedValue(new Error('Unexpected error'));

      await reorderQuestionsInInternalAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to reorder questions',
      });
    });
  });

  describe('gatherComments controller', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
      req = mockRequest();
      res = mockResponse();
      jest.clearAllMocks();
    });

    const wrapWithToObject = (obj: any) => ({
      ...obj,
      toObject: () => ({ ...obj }),
    });

    // -- This helper ensures each time we call UserModel.findById,
    // -- we get an object with the matching student ID as 'identifier'.
    const mockFindById = () => {
      jest.spyOn(UserModel, 'findById').mockImplementation((id: string) => {
        // Return a mock user doc with matching identifier
        return { _id: id, identifier: id } as any;
      });
    };

    it('should return comments filtered by short responses when type is "short"', async () => {
      req.params = { assessmentId: 'assessment1', type: 'short' };

      // Mock an authorized account (Faculty)
      const mockAccount = { _id: 'account1', crispRole: CrispRole.Faculty };
      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account1');
      jest
        .spyOn(AccountModel, 'findById')
        .mockResolvedValue(mockAccount as any);

      // Mock user find calls
      mockFindById();

      // Create two submissions with answers
      const submissions = [
        {
          answers: [
            wrapWithToObject({
              type: 'Team Member Selection Answer',
              selectedUserIds: ['student1'],
            }),
            wrapWithToObject({
              type: 'Short Response Answer',
              value: 'short comment 1',
            }),
            wrapWithToObject({
              type: 'Long Response Answer',
              value: 'long comment 1',
            }),
            wrapWithToObject({
              type: 'Short Response Answer',
              value: 'required short comment',
              isRequired: true,
            }),
          ],
        },
        {
          answers: [
            wrapWithToObject({
              type: 'Team Member Selection Answer',
              selectedUserIds: ['student2'],
            }),
            wrapWithToObject({
              type: 'Short Response Answer',
              value: 'short comment 2',
            }),
          ],
        },
      ];
      jest
        .spyOn(
          require('../../services/submissionService'),
          'getSubmissionsByAssessment'
        )
        .mockResolvedValue(submissions as any);

      await gatherComments(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Comments gathered.',
        commentsByStudent: {
          student1: {
            identifier: 'student1',
            comments: ['short comment 1', 'required short comment'],
          },
          student2: {
            identifier: 'student2',
            comments: ['short comment 2'],
          },
        },
      });
    });

    it('should return comments filtered by long responses when type is "long"', async () => {
      req.params = { assessmentId: 'assessment1', type: 'long' };

      const mockAccount = { _id: 'account1', crispRole: CrispRole.Admin };
      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account1');
      jest
        .spyOn(AccountModel, 'findById')
        .mockResolvedValue(mockAccount as any);

      // Mock user find calls
      mockFindById();

      const submissions = [
        {
          answers: [
            wrapWithToObject({
              type: 'Team Member Selection Answer',
              selectedUserIds: ['student1'],
            }),
            wrapWithToObject({
              type: 'Long Response Answer',
              value: 'long comment only',
            }),
            wrapWithToObject({
              type: 'Short Response Answer',
              value: 'short comment should be ignored',
            }),
          ],
        },
      ];
      jest
        .spyOn(
          require('../../services/submissionService'),
          'getSubmissionsByAssessment'
        )
        .mockResolvedValue(submissions as any);

      await gatherComments(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Comments gathered.',
        commentsByStudent: {
          student1: {
            identifier: 'student1',
            comments: ['long comment only'],
          },
        },
      });
    });

    it('should return both short and long comments when type is not provided', async () => {
      req.params = { assessmentId: 'assessment1' };

      const mockAccount = { _id: 'account1', crispRole: CrispRole.Faculty };
      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account1');
      jest
        .spyOn(AccountModel, 'findById')
        .mockResolvedValue(mockAccount as any);

      // Mock user find calls
      mockFindById();

      const submissions = [
        {
          answers: [
            wrapWithToObject({
              type: 'Team Member Selection Answer',
              selectedUserIds: ['student1'],
            }),
            wrapWithToObject({
              type: 'Short Response Answer',
              value: 'short comment',
            }),
            wrapWithToObject({
              type: 'Long Response Answer',
              value: 'long comment',
            }),
          ],
        },
      ];
      jest
        .spyOn(
          require('../../services/submissionService'),
          'getSubmissionsByAssessment'
        )
        .mockResolvedValue(submissions as any);

      await gatherComments(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Comments gathered.',
        commentsByStudent: {
          student1: {
            identifier: 'student1',
            comments: ['short comment', 'long comment'],
          },
        },
      });
    });

    it('should return 200 with "No submissions yet." when no submissions are found', async () => {
      req.params = { assessmentId: 'assessment1' };

      const mockAccount = { _id: 'account1', crispRole: CrispRole.Faculty };
      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account1');
      jest
        .spyOn(AccountModel, 'findById')
        .mockResolvedValue(mockAccount as any);

      jest
        .spyOn(
          require('../../services/submissionService'),
          'getSubmissionsByAssessment'
        )
        .mockResolvedValue([] as any);

      await gatherComments(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'No submissions yet.',
      });
    });

    it('should return 403 if the user is not authorized', async () => {
      req.params = { assessmentId: 'assessment1' };

      const mockAccount = { _id: 'account1', crispRole: 'Normal' };
      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account1');
      jest
        .spyOn(AccountModel, 'findById')
        .mockResolvedValue(mockAccount as any);

      await gatherComments(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'You do not have permission to gather comments.',
      });
    });

    it('should return 500 if an unexpected error occurs', async () => {
      req.params = { assessmentId: 'assessment1' };

      const mockAccount = { _id: 'account1', crispRole: CrispRole.Faculty };
      jest.spyOn(authUtils, 'getAccountId').mockResolvedValue('account1');
      jest
        .spyOn(AccountModel, 'findById')
        .mockResolvedValue(mockAccount as any);

      jest
        .spyOn(
          require('../../services/submissionService'),
          'getSubmissionsByAssessment'
        )
        .mockRejectedValue(new Error('Unexpected error'));

      await gatherComments(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to gather comments.',
      });
    });
  });
});
