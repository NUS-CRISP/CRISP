import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import Account from '../models/Account';
import User from '../models/User';

export const createAccount = async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;

  try {
    const existingAccount = await Account.findOne({ email });
    if (existingAccount) {
      return res
        .status(400)
        .send({ error: 'Account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      identifier: null,
      name: name,
      enrolledCourses: [],
      gitHandle: null,
    });

    const newAccount = new Account({
      email,
      password: passwordHash,
      role,
      isApproved: false,
      userId: newUser._id,
    });

    await newUser.save();
    await newAccount.save();
    res.status(201).send({ message: 'Account created' });
  } catch (error) {
    res.status(500).send({ error: 'Error creating account' });
  }
};

export const getPendingAccounts = async (req: Request, res: Response) => {
  try {
    const pendingAccounts = await Account.find({ isApproved: false });
    res.status(200).send(pendingAccounts);
  } catch (error) {
    res.status(500).send({ error: 'Error getting pending accounts' });
  }
};

export const approveAccount = async (req: Request, res: Response) => {
  const { accountId } = req.params;

  try {
    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).send({ error: 'Account not found' });
    }
    account.isApproved = true;
    await account.save();
    res.status(200).send({ message: 'Account approved' });
  } catch (error) {
    res.status(500).send({ error: 'Error approving account' });
  }
};
