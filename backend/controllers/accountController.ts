import { Request, Response } from 'express';
import {
  approveAccountByIds,
  createNewAccount,
  getAllPendingAccounts,
  rejectAccountByIds,
} from '../services/accountService';
import { BadRequestError } from '../services/errors';

export const createAccount = async (req: Request, res: Response) => {
  const { identifier, name, email, password, role } = req.body;

  try {
    await createNewAccount(identifier, name, email, password, role);
    res.status(201).send({ message: 'Account created' });
  } catch (error) {
    if (error instanceof BadRequestError) {
      res.status(400).send({ error: error.message });
    } else {
      console.error('Error creating account:', error);
      res.status(500).send({ error: 'Error creating account' });
    }
  }
};

export const getPendingAccounts = async (req: Request, res: Response) => {
  try {
    const accounts = await getAllPendingAccounts();
    res.status(200).send(accounts);
  } catch (error) {
    console.error('Error getting pending accounts:', error);
    res.status(500).send({ error: 'Error getting pending accounts' });
  }
};

export const approveAccounts = async (req: Request, res: Response) => {
  const { ids }: { ids: string[] } = req.body;

  try {
    await approveAccountByIds(ids);
    res.status(200).send({ message: 'Accounts approved' });
  } catch (error) {
    console.error('Error approving accounts:', error);
    res.status(500).send({ error: 'Error approving accounts' });
  }
};

export const rejectAccounts = async (req: Request, res: Response) => {
  const { ids }: { ids: string[] } = req.body;

  try {
    await rejectAccountByIds(ids);
    res.status(200).send({ message: 'Accounts rejected' });
  } catch (error) {
    console.error('Error rejecting accounts:', error);
    res.status(500).send({ error: 'Error rejecting accounts' });
  }
};
