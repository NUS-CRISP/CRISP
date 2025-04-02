import { Request, Response } from 'express';
import {
  approveAccountByIds,
  createNewAccount,
  getAccountStatusesByUserIds,
  getAllPendingAccounts,
  getAllTrialAccounts,
  rejectAccountByIds,
  updateEmailNotificationSettings,
  updateTelegramNotificationSettings,
} from '../services/accountService';
import { NotFoundError, BadRequestError } from '../services/errors';
import { getAccountId } from './../utils/auth';

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
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
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

export const getAccountStatuses = async (req: Request, res: Response) => {
  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate'
  );
  const ids = req.query?.ids;
  if (!ids || typeof ids !== 'string') {
    return res.status(400).send({ error: 'Invalid or missing IDs' });
  }
  try {
    const userIds = ids.split(',');
    const accountStatusRecord: Record<string, boolean> =
      await getAccountStatusesByUserIds(userIds);
    res.status(200).send(accountStatusRecord);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).send({ error: error.message });
    } else {
      console.error('Error getting account statuses:', error);
      res.status(500).send({ error: 'Error getting account statuses' });
    }
  }
};

export const changeEmailNotificationSettings = async (
  req: Request,
  res: Response
) => {
  const accountId = await getAccountId(req);
  const {
    wantsEmailNotifications,
    emailNotificationType,
    emailNotificationHour,
    emailNotificationWeekday,
  } = req.body;

  if (typeof wantsEmailNotifications !== 'boolean') {
    return res.status(400).json({
      error: 'wantsEmailNotifications is required and must be boolean',
    });
  }

  if (
    typeof emailNotificationType !== 'string' ||
    (emailNotificationType !== 'hourly' &&
      emailNotificationType !== 'daily' &&
      emailNotificationType !== 'weekly')
  ) {
    return res
      .status(400)
      .json({ error: 'Email notification type field formatting is incorrect' });
  }

  try {
    const updatedAccount = await updateEmailNotificationSettings(
      accountId,
      wantsEmailNotifications,
      emailNotificationType,
      emailNotificationHour,
      emailNotificationWeekday
    );
    return res.status(200).json({
      message: 'Email notification settings updated',
      account: updatedAccount,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    console.error('Error changing email notification settings:', error);
    return res
      .status(500)
      .json({ error: 'Failed to update email notification settings' });
  }
};

export const changeTelegramNotificationSettings = async (
  req: Request,
  res: Response
) => {
  const accountId = await getAccountId(req);
  const {
    wantsTelegramNotifications,
    telegramNotificationType,
    telegramNotificationHour,
    telegramNotificationWeekday,
  } = req.body;

  if (typeof wantsTelegramNotifications !== 'boolean') {
    return res.status(400).json({
      error: 'wantsTelegramNotifications is required and must be boolean',
    });
  }

  if (
    typeof telegramNotificationType !== 'string' ||
    (telegramNotificationType !== 'hourly' &&
      telegramNotificationType !== 'daily' &&
      telegramNotificationType !== 'weekly')
  ) {
    return res.status(400).json({
      error: 'Telegram notification type field formatting is incorrect',
    });
  }

  try {
    const updatedAccount = await updateTelegramNotificationSettings(
      accountId,
      wantsTelegramNotifications,
      telegramNotificationType,
      telegramNotificationHour,
      telegramNotificationWeekday
    );
    return res.status(200).json({
      message: 'Telegram notification settings updated',
      account: updatedAccount,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    console.error('Error changing telegram notification settings:', error);
    return res
      .status(500)
      .json({ error: 'Failed to update telegram notification settings' });
  }
};

// Does not start with 'get' because this method is temporary, to retrieve the id of the trial user.
// Because the trial user's ID in prod and dev was lost.
export const retrieveTrialAccounts = async (req: Request, res: Response) => {
  try {
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    const accounts = await getAllTrialAccounts();
    res.status(200).send(accounts);
  } catch (error) {
    console.error('Error getting trial accounts:', error);
    res.status(500).send({ error: 'Error getting trial accounts' });
  }
};
