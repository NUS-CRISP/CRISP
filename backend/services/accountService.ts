// accountService.ts
import bcrypt from 'bcrypt';
import Account from '../models/Account';
import User from '../models/User';
import { BadRequestError } from './errors';

export const createNewAccount = async (
  identifier: string,
  name: string,
  email: string,
  password: string,
  role: string
) => {
  const existingAccount = await Account.findOne({ email });
  if (existingAccount) {
    throw new BadRequestError('Account with this email already exists.');
  }
  const salt = await bcrypt.genSalt();
  const passwordHash = await bcrypt.hash(password, salt);
  const newUser = new User({
    identifier: identifier,
    name: name,
    enrolledCourses: [],
    gitHandle: null,
  });
  const newAccount = new Account({
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
  return await Account.find({ isApproved: false });
};

export const approveAccountByIds = async (ids: string[]) => {
  await Account.updateMany(
    { _id: { $in: ids } },
    { $set: { isApproved: true } }
  );
};
