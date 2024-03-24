import { Request, Response } from 'express';
import { logLogin, logTabSessionById } from '../services/metricService';
import { getAccountId } from '../utils/auth';
import { MissingAuthorizationError } from '../services/errors';

export const logLoginEvent = async (req: Request, res: Response) => {
  try {
    const userId = await getAccountId(req);
    await logLogin(userId);
    res.status(200).json({ message: 'Login event logged successfully' });
  } catch (error) {
    if (error instanceof MissingAuthorizationError) {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      console.error('Error logging login event:', error);
      res.status(500).json({ error: 'Failed to log login event' });
    }
  }
};

export const logTabSession = async (req: Request, res: Response) => {
  const accountId = await getAccountId(req);
  const { tabSessionData } = req.body;
  try {
    await logTabSessionById(accountId, tabSessionData);
    res.status(200).json({ message: 'Login event logged successfully' });
  } catch (error) {
    if (error instanceof MissingAuthorizationError) {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      console.error('Error logging login event:', error);
      res.status(500).json({ error: 'Failed to log login event' });
    }
  }
};
