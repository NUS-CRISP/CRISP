import bcrypt from 'bcrypt';
import AccountModel, { Account } from '../models/Account';
import UserModel from '../models/User';
import { BadRequestError, NotFoundError } from './errors';
import mongoose from 'mongoose';
import { NotificationPeriod } from '@shared/types/Account';
import CrispRoles, { CrispRole } from '@shared/types/auth/CrispRole';

export const createNewAccount = async (
  identifier: string,
  name: string,
  email: string,
  password: string,
  role: CrispRole
) => {
  const existingAccount = await AccountModel.findOne({ email });
  let newUser;

  if (existingAccount) {
    // Check for pre-created account
    if (!existingAccount.password) {
      const salt = await bcrypt.genSalt();
      const passwordHash = await bcrypt.hash(password, salt);
      existingAccount.password = passwordHash;
      existingAccount.isApproved = false;
      await existingAccount.save();
      return;
    } else {
      throw new BadRequestError('Account with this email already exists.');
    }
  } else {
    newUser = new UserModel({
      identifier: identifier,
      name: name,
      enrolledCourses: [],
      gitHandle: null,
    });

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);
    const newAccount = new AccountModel({
      email,
      password: passwordHash,
      crispRole: role,
      isApproved: false,
      user: newUser._id,
    });

    await newUser.save();
    await newAccount.save();
  }
};

export const getAllPendingAccounts = async () => {
  return await AccountModel.find({ isApproved: false });
};

export const approveAccountByIds = async (ids: string[]) => {
  await AccountModel.updateMany(
    { _id: { $in: ids } },
    { $set: { isApproved: true } }
  );
};

export const rejectAccountByIds = async (ids: string[]) => {
  await AccountModel.deleteMany({ _id: { $in: ids } });
};

export const getAccountStatusesByUserIds = async (
  userIds: string[]
): Promise<Record<string, boolean>> => {
  const objectIds = userIds.map(id => new mongoose.Types.ObjectId(id));
  const accounts = await AccountModel.find({ user: { $in: objectIds } });

  if (accounts.length === 0) {
    throw new NotFoundError('No accounts found');
  }
  const accountStatusRecord = accounts.reduce(
    (record: Record<string, boolean>, account: Account) => {
      record[account.user._id.toString()] = account.isApproved;
      return record;
    },
    {}
  );

  return accountStatusRecord;
};

export const getUserIdByAccountId = async (
  accountId: string
): Promise<string> => {
  const account = await AccountModel.findOne({ _id: accountId });
  if (account === null) {
    throw new NotFoundError('No user found');
  }
  return account.user._id.toString();
};

export const updateEmailNotificationSettings = async (
  accountId: string,
  wantsEmailNotifications: boolean,
  emailNotificationType?: NotificationPeriod,
  emailNotificationHour?: number,
  emailNotificationWeekday?: number
) => {
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new NotFoundError(`Account with id ${accountId} not found`);
  }

  account.wantsEmailNotifications = wantsEmailNotifications;

  if (emailNotificationType !== undefined) {
    account.emailNotificationType = emailNotificationType;
  }
  if (emailNotificationHour !== undefined) {
    account.emailNotificationHour = emailNotificationHour;
  }
  if (emailNotificationWeekday !== undefined) {
    account.emailNotificationWeekday = emailNotificationWeekday;
  }

  await account.save();
  return account;
};

export const updateTelegramNotificationSettings = async (
  accountId: string,
  wantsTelegramNotifications: boolean,
  telegramNotificationType?: NotificationPeriod,
  telegramNotificationHour?: number,
  telegramNotificationWeekday?: number
) => {
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new NotFoundError(`Account with id ${accountId} not found`);
  }

  account.wantsTelegramNotifications = wantsTelegramNotifications;

  if (telegramNotificationType !== undefined) {
    account.telegramNotificationType = telegramNotificationType;
  }
  if (telegramNotificationHour !== undefined) {
    account.telegramNotificationHour = telegramNotificationHour;
  }
  if (telegramNotificationWeekday !== undefined) {
    account.telegramNotificationWeekday = telegramNotificationWeekday;
  }

  await account.save();
  return account;
};

export const getAllTrialAccounts = async () => {
  return await AccountModel.find({ crispRole: CrispRoles.TrialUser }).populate('user');
};
