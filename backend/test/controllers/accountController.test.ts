import { Request, Response } from 'express';
import * as accountService from '../../services/accountService';
import {
  createAccount,
  getPendingAccounts,
  approveAccounts,
} from '../../controllers/accountController';
import { BadRequestError } from '../../services/errors';

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
  });
});
