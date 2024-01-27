import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import AccountModel from '../../models/Account';
import {
  approveAccountByIds,
  createNewAccount,
  getAllPendingAccounts,
} from '../../services/accountService';
import { BadRequestError } from '../../services/errors';

let mongo: any;

beforeAll(async () => {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  mongo = await MongoMemoryServer.create();
  const mongoUri = await mongo.getUri();

  await mongoose.connect(mongoUri);
});

beforeEach(async () => {
  const collections = await mongoose.connection.db.collections();

  for (let collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  jest.setTimeout(20000);
  await mongo.stop();
  await mongoose.connection.close();
});

const testAccountDetails = {
  identifier: 'testIdentifier',
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123',
  role: 'Teaching assistant',
};

async function createTestAccount(changes = {}) {
  const accountData = { ...testAccountDetails, ...changes };
  await createNewAccount(
    accountData.identifier,
    accountData.name,
    accountData.email,
    accountData.password,
    accountData.role
  );
  return await AccountModel.findOne({ email: accountData.email });
}

describe('accountService', () => {
  beforeEach(async () => {
    await AccountModel.deleteMany({});
  });

  describe('createNewAccount', () => {
    it('should create a new account', async () => {
      await createTestAccount();
      const savedAccount = await AccountModel.findOne({
        email: testAccountDetails.email,
      });
      expect(savedAccount).toBeTruthy();
      expect(savedAccount?.email).toBe(testAccountDetails.email);
    });

    it('should throw BadRequestError if account with email already exists', async () => {
      await createTestAccount();
      await expect(
        createNewAccount(
          testAccountDetails.identifier,
          testAccountDetails.name,
          testAccountDetails.email,
          testAccountDetails.password,
          testAccountDetails.role
        )
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getAllPendingAccounts', () => {
    it('should return only accounts that are not approved', async () => {
      await createTestAccount({
        email: 'pending@example.com',
        identifier: 'testIdentifier1',
        isApproved: false,
      });

      // Call the function under test
      const pendingAccounts = await getAllPendingAccounts();

      // Expect to get only the not approved accounts
      expect(pendingAccounts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: 'pending@example.com',
            isApproved: false,
          }),
        ])
      );
      expect(pendingAccounts.length).toBe(1);
    });
  });

  describe('approveAccountByIds', () => {
    it('should approve accounts by their IDs', async () => {
      // Create two new accounts that are not approved
      const account1 = await createTestAccount({
        email: 'approve1@example.com',
        identifier: 'testIdentifier1',
        isApproved: false,
      });
      const account2 = await createTestAccount({
        email: 'approve2@example.com',
        identifier: 'testIdentifier2',
        isApproved: false,
      });

      // Make sure the accounts are not null
      if (!account1 || !account2) {
        throw new Error('Test accounts could not be created');
      }

      // Call the function under test with the IDs of the accounts to approve
      await approveAccountByIds([account1._id, account2._id]);

      // Fetch the accounts again to check their approval status
      const updatedAccount1 = await AccountModel.findById(account1._id);
      const updatedAccount2 = await AccountModel.findById(account2._id);

      // Make sure the updated accounts are not null
      if (!updatedAccount1 || !updatedAccount2) {
        throw new Error('Test accounts could not be found after approval');
      }

      // Expect the accounts to be approved
      expect(updatedAccount1.isApproved).toBe(true);
      expect(updatedAccount2.isApproved).toBe(true);
    });

    it('should not throw an error if an empty array is passed', async () => {
      // This test ensures that the function does not throw if there are no IDs to update
      await expect(approveAccountByIds([])).resolves.not.toThrow();
    });
  });
});
