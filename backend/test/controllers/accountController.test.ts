import { Request, Response } from 'express';
import * as auth from '../../utils/auth';
import {
  approveAccounts,
  changeEmailNotificationSettings,
  changeTelegramNotificationSettings,
  createAccount,
  getAccountStatuses,
  getPendingAccounts,
  rejectAccounts,
} from '../../controllers/accountController';
import * as accountService from '../../services/accountService';
import { BadRequestError, NotFoundError } from '../../services/errors';

jest.mock('../../services/accountService');

beforeEach(() => {
  jest.spyOn(auth, 'getAccountId').mockResolvedValue('mockAccountId');
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
  res.json = jest.fn().mockReturnValue(res);
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

  describe('changeEmailNotificationSettings', () => {
    it('should return 400 if wantsEmailNotifications is not boolean', async () => {
      const req = mockRequest();
      const res = mockResponse();

      req.body = {
        wantsEmailNotifications: 'notBoolean', // invalid
        emailNotificationType: 'daily',
      };

      await changeEmailNotificationSettings(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'wantsEmailNotifications is required and must be boolean',
      });
    });

    it('should return 400 if emailNotificationType is invalid', async () => {
      const req = mockRequest();
      const res = mockResponse();

      req.body = {
        wantsEmailNotifications: true,
        emailNotificationType: 'invalid', // not 'hourly', 'daily', or 'weekly'
      };

      await changeEmailNotificationSettings(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Email notification type field formatting is incorrect',
      });
    });

    it('should return 404 if account is not found', async () => {
      const req = mockRequest();
      const res = mockResponse();

      req.body = {
        wantsEmailNotifications: true,
        emailNotificationType: 'daily',
      };

      // Mock the service to throw a NotFoundError
      (
        accountService.updateEmailNotificationSettings as jest.Mock
      ).mockRejectedValue(new NotFoundError('Account not found'));

      await changeEmailNotificationSettings(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Account not found',
      });
    });

    it('should return 500 for other errors', async () => {
      const req = mockRequest();
      const res = mockResponse();

      req.body = {
        wantsEmailNotifications: true,
        emailNotificationType: 'daily',
      };

      (
        accountService.updateEmailNotificationSettings as jest.Mock
      ).mockRejectedValue(new Error('Some server error'));

      await changeEmailNotificationSettings(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to update email notification settings',
      });
    });

    it('should update the email notification settings successfully', async () => {
      const req = mockRequest();
      const res = mockResponse();

      req.body = {
        wantsEmailNotifications: true,
        emailNotificationType: 'weekly',
        emailNotificationHour: 9,
        emailNotificationWeekday: 3,
      };

      // Mock successful return of updated account
      const mockUpdatedAccount = {
        _id: 'accountABC',
        wantsEmailNotifications: true,
        emailNotificationType: 'weekly',
        emailNotificationHour: 9,
        emailNotificationWeekday: 3,
      };
      (
        accountService.updateEmailNotificationSettings as jest.Mock
      ).mockResolvedValue(mockUpdatedAccount);

      await changeEmailNotificationSettings(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Email notification settings updated',
        account: mockUpdatedAccount,
      });
    });
  });

  describe('changeTelegramNotificationSettings', () => {
    it('should return 400 if wantsTelegramNotifications is not boolean', async () => {
      const req = mockRequest();
      const res = mockResponse();

      req.body = {
        wantsTelegramNotifications: 'invalidBoolean', // invalid
        telegramNotificationType: 'daily',
      };

      await changeTelegramNotificationSettings(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'wantsTelegramNotifications is required and must be boolean',
      });
    });

    it('should return 400 if telegramNotificationType is invalid', async () => {
      const req = mockRequest();
      const res = mockResponse();

      req.body = {
        wantsTelegramNotifications: true,
        telegramNotificationType: 'invalid', // not allowed
      };

      await changeTelegramNotificationSettings(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Telegram notification type field formatting is incorrect',
      });
    });

    it('should return 404 if account is not found', async () => {
      const req = mockRequest();
      const res = mockResponse();

      req.body = {
        wantsTelegramNotifications: true,
        telegramNotificationType: 'hourly',
      };

      (
        accountService.updateTelegramNotificationSettings as jest.Mock
      ).mockRejectedValue(new NotFoundError('Account not found'));

      await changeTelegramNotificationSettings(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Account not found',
      });
    });

    it('should return 500 for other errors', async () => {
      const req = mockRequest();
      const res = mockResponse();

      req.body = {
        wantsTelegramNotifications: true,
        telegramNotificationType: 'hourly',
      };

      (
        accountService.updateTelegramNotificationSettings as jest.Mock
      ).mockRejectedValue(new Error('Some server error'));

      await changeTelegramNotificationSettings(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to update telegram notification settings',
      });
    });

    it('should update the telegram notification settings successfully', async () => {
      const req = mockRequest();
      const res = mockResponse();

      req.body = {
        wantsTelegramNotifications: true,
        telegramNotificationType: 'daily',
        telegramNotificationHour: 14,
        telegramNotificationWeekday: 5,
      };

      const mockUpdatedAccount = {
        _id: 'accountABC',
        wantsTelegramNotifications: true,
        telegramNotificationType: 'daily',
        telegramNotificationHour: 14,
        telegramNotificationWeekday: 5,
      };

      (
        accountService.updateTelegramNotificationSettings as jest.Mock
      ).mockResolvedValue(mockUpdatedAccount);

      await changeTelegramNotificationSettings(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Telegram notification settings updated',
        account: mockUpdatedAccount,
      });
    });
  });
});
