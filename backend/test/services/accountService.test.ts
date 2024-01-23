import bcrypt from 'bcrypt';
import {
  createNewAccount,
  getAllPendingAccounts,
  approveAccountByIds,
} from '../../services/accountService';
import AccountModel from '../../models/Account';
import UserModel from '../../models/User';
import { BadRequestError } from '../../services/errors';

jest.mock('bcrypt');
jest.mock('../../models/Account');
jest.mock('../../models/User');

afterEach(() => {
  jest.restoreAllMocks();
});

describe('accountService', () => {
  describe('createNewAccount', () => {
    it('should create a new account successfully', async () => {
      const mockBcryptSalt = 'mock_salt';
      const mockBcryptHash = 'mock_hashed_password';
      jest
        .spyOn(bcrypt, 'genSalt')
        .mockImplementation(() => Promise.resolve(mockBcryptSalt));
      jest
        .spyOn(bcrypt, 'hash')
        .mockImplementation(() => Promise.resolve(mockBcryptHash));
      jest.spyOn(AccountModel, 'findOne').mockResolvedValue(null);
      jest.spyOn(UserModel.prototype, 'save').mockResolvedValue(undefined);
      jest.spyOn(AccountModel.prototype, 'save').mockResolvedValue(undefined);

      await expect(
        createNewAccount(
          'id123',
          'John Doe',
          'john@example.com',
          'password123',
          'student'
        )
      ).resolves.not.toThrow();

      expect(bcrypt.genSalt).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', mockBcryptSalt);
      expect(UserModel.prototype.save).toHaveBeenCalled();
      expect(AccountModel.prototype.save).toHaveBeenCalled();
    });

    it('should throw BadRequestError if account with email already exists', async () => {
      jest
        .spyOn(AccountModel, 'findOne')
        .mockResolvedValue({ email: 'john@example.com' });

      await expect(
        createNewAccount(
          'id123',
          'John Doe',
          'john@example.com',
          'password123',
          'student'
        )
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw an error if user save fails', async () => {
      jest.spyOn(AccountModel, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(UserModel.prototype, 'save')
        .mockRejectedValue(new Error('User save failed'));
      // No need to mock AccountModel save since it should not be called if user save fails.

      await expect(
        createNewAccount(
          'id123',
          'John Doe',
          'john@example.com',
          'password123',
          'student'
        )
      ).rejects.toThrow('User save failed');
    });

    it('should throw an error if account save fails', async () => {
      jest.spyOn(AccountModel, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(UserModel.prototype, 'save')
        .mockResolvedValue(undefined as any); // Assuming the user is saved successfully.
      jest
        .spyOn(AccountModel.prototype, 'save')
        .mockRejectedValue(new Error('Account save failed'));

      await expect(
        createNewAccount(
          'id123',
          'John Doe',
          'john@example.com',
          'password123',
          'student'
        )
      ).rejects.toThrow('Account save failed');
    });
  });

  describe('getAllPendingAccounts', () => {
    it('should retrieve all pending accounts', async () => {
      const mockAccounts = [
        { email: 'pending@example.com', isApproved: false },
      ];
      jest.spyOn(AccountModel, 'find').mockResolvedValue(mockAccounts);

      const accounts = await getAllPendingAccounts();

      expect(accounts).toEqual(mockAccounts);
      expect(AccountModel.find).toHaveBeenCalledWith({ isApproved: false });
    });

    it('should handle database errors gracefully', async () => {
      jest
        .spyOn(AccountModel, 'find')
        .mockRejectedValue(new Error('Database error'));

      await expect(getAllPendingAccounts()).rejects.toThrow('Database error');
    });
  });

  describe('approveAccountByIds', () => {
    it('should approve accounts by given ids', async () => {
      jest
        .spyOn(AccountModel, 'updateMany')
        .mockResolvedValue({ nModified: 2 } as any);

      await approveAccountByIds(['id1', 'id2']);

      expect(AccountModel.updateMany).toHaveBeenCalledWith(
        { _id: { $in: ['id1', 'id2'] } },
        { $set: { isApproved: true } }
      );
    });

    it('should handle database errors gracefully', async () => {
      jest
        .spyOn(AccountModel, 'updateMany')
        .mockRejectedValue(new Error('Database error'));

      await expect(approveAccountByIds(['id1', 'id2'])).rejects.toThrow(
        'Database error'
      );
    });
  });
});
