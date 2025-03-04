import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import AccountModel from '../../models/Account';
import {
  approveAccountByIds,
  createNewAccount,
  getAccountStatusesByUserIds,
  getAllPendingAccounts,
  rejectAccountByIds,
  getUserIdByAccountId,
  updateEmailNotificationSettings,
  updateTelegramNotificationSettings,
  getAllTrialAccounts,
} from '../../services/accountService';
import { BadRequestError, NotFoundError } from '../../services/errors';
import UserModel from '@models/User';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const mongoUri = await mongo.getUri();

  await mongoose.connect(mongoUri);
});

beforeEach(async () => {
  const collections = await mongoose.connection.db.collections();

  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
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

async function createTestAccountWithoutPassword(changes = {}) {
  const accountData = { ...testAccountDetails, ...changes };
  const newAccount = new AccountModel({
    email: accountData.email,
    role: accountData.role,
    isApproved: false,
  });

  await newAccount.save();
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

    it('should update existing account if existing account has no password', async () => {
      const existingAccount = await createTestAccountWithoutPassword();
      expect(existingAccount?.password).toBeFalsy();

      await createNewAccount(
        testAccountDetails.identifier,
        testAccountDetails.name,
        testAccountDetails.email,
        testAccountDetails.password,
        testAccountDetails.role
      );
      const savedAccount = await AccountModel.findOne({
        email: testAccountDetails.email,
      });
      expect(savedAccount).toBeTruthy();
      expect(savedAccount?.email).toBe(testAccountDetails.email);
      expect(savedAccount?.password).toBeTruthy();
    });
  });

  describe('getAllPendingAccounts', () => {
    it('should return only accounts that are not approved', async () => {
      await createTestAccount({
        email: 'pending@example.com',
        identifier: 'testIdentifier1',
      });

      const pendingAccounts = await getAllPendingAccounts();

      expect(pendingAccounts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: 'pending@example.com',
          }),
        ])
      );
      expect(pendingAccounts.length).toBe(1);
    });
  });

  describe('approveAccountByIds', () => {
    it('should approve accounts by their IDs', async () => {
      const account1 = await createTestAccount({
        email: 'approve1@example.com',
        identifier: 'testIdentifier1',
      });
      const account2 = await createTestAccount({
        email: 'approve2@example.com',
        identifier: 'testIdentifier2',
      });

      if (!account1 || !account2) {
        throw new Error('Test accounts could not be created');
      }

      await approveAccountByIds([account1._id, account2._id]);

      const updatedAccount1 = await AccountModel.findById(account1._id);
      const updatedAccount2 = await AccountModel.findById(account2._id);

      if (!updatedAccount1 || !updatedAccount2) {
        throw new Error('Test accounts could not be found after approval');
      }

      expect(updatedAccount1.isApproved).toBe(true);
      expect(updatedAccount2.isApproved).toBe(true);
    });

    it('should not throw an error if an empty array is passed', async () => {
      await expect(approveAccountByIds([])).resolves.not.toThrow();
    });
  });

  describe('rejectAccountByIds', () => {
    it('should reject accounts by their IDs', async () => {
      const account1 = await createTestAccount({
        email: 'approve1@example.com',
        identifier: 'testIdentifier1',
      });
      const account2 = await createTestAccount({
        email: 'approve2@example.com',
        identifier: 'testIdentifier2',
      });

      if (!account1 || !account2) {
        throw new Error('Test accounts could not be created');
      }

      await rejectAccountByIds([account1._id, account2._id]);

      const updatedAccount1 = await AccountModel.findById(account1._id);
      const updatedAccount2 = await AccountModel.findById(account2._id);

      expect(updatedAccount1).toBe(null);
      expect(updatedAccount2).toBe(null);
    });

    it('should not throw an error if an empty array is passed', async () => {
      await expect(rejectAccountByIds([])).resolves.not.toThrow();
    });
  });

  describe('getAccountStatusesByUserIds', () => {
    it('should get account statuses', async () => {
      const account1 = await createTestAccount({
        email: 'approve1@example.com',
        identifier: 'testIdentifier1',
      });

      const account2 = await createTestAccount({
        email: 'approve2@example.com',
        identifier: 'testIdentifier2',
      });

      if (!account1 || !account2) {
        throw new Error('Test accounts could not be created');
      }

      const user1 = await new UserModel({
        identifier: 'test1',
        name: 'test1',
      }).save();
      account1.user = user1._id;
      await account1.save();

      const user2 = await new UserModel({
        identifier: 'test2',
        name: 'test2',
      }).save();
      account2.user = user2._id;
      account2.isApproved = true;
      await account2.save();

      const userIds = [user1._id.toHexString(), user2._id.toHexString()];
      const accountStatusRecord = await getAccountStatusesByUserIds(userIds);
      expect(accountStatusRecord[user1._id.toHexString()]).toBe(false);
      expect(accountStatusRecord[user2._id.toHexString()]).toBe(true);
    });

    it('should throw an error if an empty array is passed', async () => {
      await expect(getAccountStatusesByUserIds([])).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('getUserIdByAccountId', () => {
    it('should return the user ID for a valid account ID', async () => {
      const account = await createTestAccount({
        email: 'user@example.com',
        identifier: 'user123',
      });
      expect(account).toBeTruthy();
      if (!account) throw new Error('Test account not created');
      const userId = await getUserIdByAccountId(account._id.toString());
      expect(userId).toBe(account.user.toHexString());
    });

    it('should throw NotFoundError if the account ID does not exist', async () => {
      const nonExistentAccountId = new mongoose.Types.ObjectId().toHexString();
      await expect(getUserIdByAccountId(nonExistentAccountId)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw a CastError for an invalid account ID format', async () => {
      const invalidAccountId = '12345';
      await expect(getUserIdByAccountId(invalidAccountId)).rejects.toThrow();
    });
  });

  describe('updateEmailNotificationSettings', () => {
    it('should throw NotFoundError if the account does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toHexString();
      await expect(
        updateEmailNotificationSettings(
          nonExistentId,
          true, // wantsEmailNotifications
          'daily',
          8,
          3
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should update the email notification fields if provided', async () => {
      // 1) Create test account
      const account = await createTestAccount();
      expect(account).toBeTruthy();
      if (!account) throw new Error('Account not created');

      // 2) Call service to update fields
      const updated = await updateEmailNotificationSettings(
        account._id.toString(),
        true,
        'weekly',
        10,
        5
      );

      // 3) Ensure the returned account has updated values
      expect(updated.wantsEmailNotifications).toBe(true);
      expect(updated.emailNotificationType).toBe('weekly');
      expect(updated.emailNotificationHour).toBe(10);
      expect(updated.emailNotificationWeekday).toBe(5);

      // 4) Fetch fresh from DB to confirm
      const fromDb = await AccountModel.findById(account._id);
      expect(fromDb?.wantsEmailNotifications).toBe(true);
      expect(fromDb?.emailNotificationType).toBe('weekly');
      expect(fromDb?.emailNotificationHour).toBe(10);
      expect(fromDb?.emailNotificationWeekday).toBe(5);
    });

    it('should not overwrite existing fields if they are undefined', async () => {
      // 1) Create test account with some initial settings
      const account = await createTestAccount();
      if (!account) throw new Error('Account not created');

      account.wantsEmailNotifications = false;
      account.emailNotificationType = 'daily';
      account.emailNotificationHour = 8;
      account.emailNotificationWeekday = 2;
      await account.save();

      // 2) Update only "wantsEmailNotifications" => pass others as undefined
      const updated = await updateEmailNotificationSettings(
        account._id.toString(),
        true // pass only wantsEmailNotifications
        // Do not pass other fields => they remain undefined
      );

      // 3) Check that hour, weekday, and type remain the same
      expect(updated.wantsEmailNotifications).toBe(true); // changed
      expect(updated.emailNotificationType).toBe('daily'); // unchanged
      expect(updated.emailNotificationHour).toBe(8); // unchanged
      expect(updated.emailNotificationWeekday).toBe(2); // unchanged
    });
  });

  // -----------------------------------------
  // NEW TESTS FOR updateTelegramNotificationSettings
  // -----------------------------------------
  describe('updateTelegramNotificationSettings', () => {
    it('should throw NotFoundError if the account does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toHexString();
      await expect(
        updateTelegramNotificationSettings(
          nonExistentId,
          true, // wantsTelegramNotifications
          'daily',
          12,
          4
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should update the telegram notification fields if provided', async () => {
      // 1) Create test account
      const account = await createTestAccount();
      expect(account).toBeTruthy();
      if (!account) throw new Error('Account not created');

      // 2) Call service to update fields
      const updated = await updateTelegramNotificationSettings(
        account._id.toString(),
        true,
        'hourly',
        14,
        1
      );

      // 3) Ensure the returned account has updated values
      expect(updated.wantsTelegramNotifications).toBe(true);
      expect(updated.telegramNotificationType).toBe('hourly');
      expect(updated.telegramNotificationHour).toBe(14);
      expect(updated.telegramNotificationWeekday).toBe(1);

      // 4) Fetch fresh from DB
      const fromDb = await AccountModel.findById(account._id);
      expect(fromDb?.wantsTelegramNotifications).toBe(true);
      expect(fromDb?.telegramNotificationType).toBe('hourly');
      expect(fromDb?.telegramNotificationHour).toBe(14);
      expect(fromDb?.telegramNotificationWeekday).toBe(1);
    });

    it('should not overwrite existing fields if they are undefined', async () => {
      // 1) Create test account with some initial Telegram settings
      const account = await createTestAccount();
      if (!account) throw new Error('Account not created');

      account.wantsTelegramNotifications = false;
      account.telegramNotificationType = 'weekly';
      account.telegramNotificationHour = 20;
      account.telegramNotificationWeekday = 7;
      await account.save();

      // 2) Update only "wantsTelegramNotifications"
      const updated = await updateTelegramNotificationSettings(
        account._id.toString(),
        true // only set wantsTelegramNotifications = true
        // other fields not passed
      );

      // 3) Confirm the other fields remain unchanged
      expect(updated.wantsTelegramNotifications).toBe(true);
      expect(updated.telegramNotificationType).toBe('weekly'); // unchanged
      expect(updated.telegramNotificationHour).toBe(20); // unchanged
      expect(updated.telegramNotificationWeekday).toBe(7); // unchanged
    });
  });
});

describe('getAllTrialAccounts', () => {
  it('should return only trial accounts', async () => {
    await createTestAccount({
      email: 'pending@example.com',
      identifier: 'testIdentifier1',
      role: 'Trial User',
    });

    const pendingAccounts = await getAllTrialAccounts();

    expect(pendingAccounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: 'pending@example.com',
        }),
      ])
    );
    expect(pendingAccounts.length).toBe(1);
  });
});
