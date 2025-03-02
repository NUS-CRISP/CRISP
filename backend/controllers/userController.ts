import { Request, Response } from 'express';
import {
  BadRequestError,
  MissingAuthorizationError,
  NotFoundError,
} from '../services/errors';
import { editUser, getUserByGitHandle } from '../services/userService';
import { getAccountId } from '../utils/auth';
import AccountModel from '@models/Account';

export const updateUser = async (req: Request, res: Response) => {
  try {
    const accountId = await getAccountId(req);
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

// We use this here instead of accountController to avoid exposing account API to non-admins
export const getUserNotificationSettings = async (
  req: Request,
  res: Response
) => {
  try {
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    const accountId = await getAccountId(req);
    if (!accountId) res.status(401).json({ error: 'Account not logged in' });
    const account = await AccountModel.findById(accountId);
    if (!account)
      res
        .status(401)
        .json({ error: 'Account of logged in account id not found' });
    res.status(200).json({
      email: account?.email,
      emailNotificationType: account?.emailNotificationType,
      emailNotificationHour: account?.emailNotificationHour,
      emailNotificationWeekday: account?.emailNotificationWeekday,
      telegramChatId: account?.telegramChatId,
      telegramNotificationType: account?.telegramNotificationType,
      telegramNotificationHour: account?.telegramNotificationHour,
      telegramNotificationWeekday: account?.telegramNotificationWeekday,
      wantsEmailNotifications: account?.wantsEmailNotifications,
      wantsTelegramNotifications: account?.wantsTelegramNotifications,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Failed to fetch user notification settings' });
  }
};
