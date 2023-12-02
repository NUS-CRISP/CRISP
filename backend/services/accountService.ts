// accountService.ts
import bcrypt from 'bcrypt';
import AccountModel from '../models/Account';
import UserModel from '../models/User';
import { BadRequestError } from './errors';

export const createNewAccount = async (
  identifier: string,
  name: string,
  email: string,
  password: string,
  role: string
) => {
  const existingAccount = await AccountModel.findOne({ email });
  if (existingAccount) {
    throw new BadRequestError('Account with this email already exists.');
  }
  const salt = await bcrypt.genSalt();
  const passwordHash = await bcrypt.hash(password, salt);
  const newUser = new UserModel({
    identifier: identifier,
    name: name,
    enrolledCourses: [],
    gitHandle: null,
  });
  const newAccount = new AccountModel({
    email,
    password: passwordHash,
    role,
    isApproved: false,
    user: newUser._id,
  });
  await newUser.save();
  await newAccount.save();
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
