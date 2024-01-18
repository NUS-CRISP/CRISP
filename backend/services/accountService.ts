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
  let existingAccount = await AccountModel.findOne({ email });
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
      role,
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
