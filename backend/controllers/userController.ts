import { Request, Response } from 'express';
import {
  BadRequestError,
  MissingAuthorizationError,
  NotFoundError,
} from '../services/errors';
import { editUser, getUserByGitHandle } from '../services/userService';
import { getAccountId } from '../utils/auth';

export const updateUser = async (req: Request, res: Response) => {
  const accountId = await getAccountId(req);
  try {
    const { userId } = req.params;
    const updateData = req.body;
    await editUser(accountId, userId, updateData);
    res.status(200).json({ message: 'User updated successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof BadRequestError) {
      res.status(400).json({ error: error.message });
    } else if (error instanceof MissingAuthorizationError) {
      res.status(400).json({ error: 'Missing authorization' });
    } else {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
};

export const getUserByHandle = async (req: Request, res: Response) => {
  try {
    const { gitHandle } = req.query;
    if (typeof gitHandle !== 'string') {
      res.status(400).json({ error: 'Invalid git handle' });
      return;
    }
    const user = await getUserByGitHandle(gitHandle);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user by git handle' });
  }
};
