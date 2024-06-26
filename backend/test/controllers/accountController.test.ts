import { Request, Response } from 'express';
import {
  approveAccounts,
  createAccount,
  getAccountStatuses,
  getPendingAccounts,
  rejectAccounts,
} from '../../controllers/accountController';
import * as accountService from '../../services/accountService';
import { BadRequestError, NotFoundError } from '../../services/errors';

jest.mock('../../services/accountService');

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
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe('accountController', () => {
  describe('createAccount', () => {
    it('should create a new account and send a 201 status', async () => {
      const req = mockRequest();
      req.body = {
        identifier: 'user001',
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'student',
      };
      const res = mockResponse();

      jest
        .spyOn(accountService, 'createNewAccount')
        .mockResolvedValue(undefined);

      await createAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith({ message: 'Account created' });
    });

    it('should handle BadRequestError and send a 400 status', async () => {
      const req = mockRequest();
      req.body = {
        identifier: 'user001',
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'student',
      };
      const res = mockResponse();

      jest
        .spyOn(accountService, 'createNewAccount')
        .mockRejectedValue(new BadRequestError('Invalid data'));

      await createAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ error: 'Invalid data' });
    });

    it('should handle error and send a 500 status', async () => {
      const req = mockRequest();
      req.body = {
        identifier: 'user001',
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'student',
      };
      const res = mockResponse();

      jest
        .spyOn(accountService, 'createNewAccount')
        .mockRejectedValue(new Error('Error creating account'));

      await createAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Error creating account',
      });
    });
  });

  describe('getPendingAccounts', () => {
    it('should retrieve pending accounts and send a 200 status', async () => {
      const req = mockRequest();
      const res = mockResponse();
      const mockAccounts = [{ email: 'pending@example.com', role: 'student' }];

      jest
        .spyOn(accountService, 'getAllPendingAccounts')
        .mockResolvedValue(mockAccounts as any);

      await getPendingAccounts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockAccounts);
    });

    it('should handle error and send a 500 status', async () => {
      const req = mockRequest();
      const res = mockResponse();

      jest
        .spyOn(accountService, 'getAllPendingAccounts')
        .mockRejectedValue(new Error('Error getting pending accounts'));

      await getPendingAccounts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Error getting pending accounts',
      });
    });
  });

  describe('approveAccounts', () => {
    it('should approve accounts and send a 200 status', async () => {
      const req = mockRequest();
      req.body = { ids: ['123', '456'] };
      const res = mockResponse();

      jest
        .spyOn(accountService, 'approveAccountByIds')
        .mockResolvedValue(undefined);

      await approveAccounts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ message: 'Accounts approved' });
    });

    it('should handle error and send a 500 status', async () => {
      const req = mockRequest();
      req.body = { ids: ['123', '456'] };
      const res = mockResponse();

      jest
        .spyOn(accountService, 'approveAccountByIds')
        .mockRejectedValue(new Error('Error approving accounts'));

      await approveAccounts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Error approving accounts',
      });
    });
  });

  describe('rejectAccounts', () => {
    it('should reject accounts and send a 200 status', async () => {
      const req = mockRequest();
      req.body = { ids: ['123', '456'] };
      const res = mockResponse();

      jest
        .spyOn(accountService, 'rejectAccountByIds')
        .mockResolvedValue(undefined);

      await rejectAccounts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ message: 'Accounts rejected' });
    });

    it('should handle error and send a 500 status', async () => {
      const req = mockRequest();
      req.body = { ids: ['123', '456'] };
      const res = mockResponse();

      jest
        .spyOn(accountService, 'rejectAccountByIds')
        .mockRejectedValue(new Error('Error approving accounts'));

      await rejectAccounts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Error rejecting accounts',
      });
    });
  });

  describe('getAccountStatusesByUserIds', () => {
    it('should return account statuses for given user IDs', async () => {
      const req = mockRequest();
      req.query = { ids: 'id1,id2' };
      const res = mockResponse();
      const mockStatuses = { id1: true, id2: false };

      jest
        .spyOn(accountService, 'getAccountStatusesByUserIds')
        .mockResolvedValue(mockStatuses);

      await getAccountStatuses(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockStatuses);
    });

    it('should handle invalid IDs and send a 400 status', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await getAccountStatuses(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Invalid or missing IDs',
      });
    });

    it('should handle NotFound and send a 404 status', async () => {
      const req = mockRequest();
      req.query = { ids: 'id1,id2' };
      const res = mockResponse();

      jest
        .spyOn(accountService, 'getAccountStatusesByUserIds')
        .mockRejectedValue(new NotFoundError('No accounts found'));

      await getAccountStatuses(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({ error: 'No accounts found' });
    });

    it('should handle error and send a 500 status', async () => {
      const req = mockRequest();
      req.query = { ids: 'id1,id2' };
      const res = mockResponse();

      jest
        .spyOn(accountService, 'getAccountStatusesByUserIds')
        .mockRejectedValue(new Error('Error getting account statuses'));

      await getAccountStatuses(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        error: 'Error getting account statuses',
      });
    });
  });
});
