import mongoose, { ConnectOptions } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import AccountModel from '../../models/Account';
import UserModel from '../../models/User';
import CrispRole from '@shared/types/auth/CrispRole';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as ConnectOptions);
});

beforeEach(async () => {
  await AccountModel.deleteMany({});
  await UserModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('AccountModel', () => {
  it('should create and save a new account', async () => {
    const userData = new UserModel({ name: 'Test User', identifier: 'U001' });
    await userData.save();

    const accountData: any = {
      email: 'test@example.com',
      password: 'password123',
      crispRole: CrispRole.Faculty,
      isApproved: false,
      user: userData._id,
    };

    const account = new AccountModel(accountData);
    const savedAccount = await account.save();

    expect(savedAccount.email).toEqual(accountData.email);
    expect(savedAccount.isApproved).toBe(false);
    expect(savedAccount.crispRole).toEqual(CrispRole.Faculty);
  });

  it('should update an existing account', async () => {
    const user = new UserModel({ name: 'Existing User', identifier: 'E001' });
    await user.save();

    const account = new AccountModel({
      email: 'existing@example.com',
      password: 'password123',
      crispRole: CrispRole.Normal,
      isApproved: false,
      user: user._id,
    });
    await account.save();

    const updatedAccountData = { isApproved: true };
    const updatedAccount = await AccountModel.findByIdAndUpdate(
      account._id,
      updatedAccountData,
      { new: true }
    );

    expect(updatedAccount?.isApproved).toBe(true);
  });

  it('should delete an existing account', async () => {
    const user = new UserModel({ name: 'User to Delete', identifier: 'D001' });
    await user.save();

    const account = new AccountModel({
      email: 'delete@example.com',
      password: 'password123',
      crispRole: CrispRole.Normal,
      isApproved: false,
      user: user._id,
    });
    await account.save();

    await AccountModel.deleteOne({ _id: account._id });
    const deletedAccount = await AccountModel.findById(account._id);

    expect(deletedAccount).toBeNull();
  });

  it('should not allow duplicate emails', async () => {
    const user1 = new UserModel({ name: 'User One', identifier: 'UO01' });
    const user2 = new UserModel({ name: 'User Two', identifier: 'UO02' });
    await Promise.all([user1.save(), user2.save()]);

    const account1 = new AccountModel({
      email: 'unique@example.com',
      password: 'password123',
      crispRole: CrispRole.Normal,
      isApproved: true,
      user: user1._id,
    });
    await account1.save();

    const account2 = new AccountModel({
      email: 'unique@example.com',
      password: 'password321',
      crispRole: CrispRole.Normal,
      isApproved: false,
      user: user2._id,
    });

    await expect(account2.save()).rejects.toThrow();
  });

  it('should not save an account without required fields', async () => {
    const accountData = {
      // Missing email and password
      crispRole: CrispRole.Normal,
      isApproved: true,
    };

    const account = new AccountModel(accountData);
    await expect(account.save()).rejects.toThrow();
  });
});
