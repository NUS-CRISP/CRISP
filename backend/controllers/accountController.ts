import { Request, Response } from 'express';
import { approveAccountByIds, createNewAccount, getAllPendingAccounts } from '../services/accountService';

export const createAccount = async (req: Request, res: Response) => {
  const { identifier, name, email, password, role } = req.body;

  try {
    await createNewAccount(identifier, name, email, password, role);
    res.status(201).send({ message: 'Account created' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Account with this email already exists.') {
      res.status(400).send({ error: error.message });
    } else {
      res.status(500).send({ error: 'Error creating account' });
    }
  }
};

export const getPendingAccounts = async (req: Request, res: Response) => {
  try {
    const accounts = await getAllPendingAccounts();
    res.status(200).send(accounts);
  } catch (error) {
    res.status(500).send({ error: 'Error getting pending accounts' });
  }
};

export const approveAccounts = async (req: Request, res: Response) => {
  const { ids }: { ids: string[] } = req.body;

  try {
    await approveAccountByIds(ids);
    res.status(200).send({ message: 'Accounts approved' });
  } catch (error) {
    res.status(500).send({ error: 'Error approving accounts' });
  }
};
