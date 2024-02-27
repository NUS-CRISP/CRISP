import { Request, Response } from 'express';
import { BadRequestError, NotFoundError } from '../services/errors';
import { getAccountId } from '../utils/auth';
import { editUser } from '../services/userService';

export const updateUser = async (req: Request, res: Response) => {
  const accountId = await getAccountId(req);
  if (!accountId) {
    res.status(400).json({ error: 'Missing authorization' });
    return;
  }
  try {
    const { userId } = req.params;
    const { updateData } = req.body;
    await editUser(accountId, userId, updateData);
    res.status(200).json({ message: 'User updated successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    } else if (error instanceof BadRequestError) {
      res.status(400).json({ error: error.message });
      return;
    } else {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
};
