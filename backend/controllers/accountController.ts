import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import Account from '../models/Account';
import User from '../models/User';

export const createAccount = async (req: Request, res: Response) => {
  const { identifier, name, email, password, role } = req.body;

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
    res.status(201).send({ message: 'Account created' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).send({ error: error.message });
    } else {
      res.status(500).send({ error: 'Error creating account' });
    }
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

export const approveAccounts = async (req: Request, res: Response) => {
  const { ids }: { ids: string[] } = req.body;

  try {
    await Account.updateMany(
      { _id: { $in: ids } },
      { $set: { isApproved: true } }
    );
    res.status(200).send({ message: 'Accounts approved' });
  } catch (error) {
    res.status(500).send({ error: 'Error approving accounts' });
  }
};
