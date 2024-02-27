import { Request, Response } from 'express';
import { logLogin } from '../services/metricService';
import { getAccountId } from '../utils/auth';

export const logLoginEvent = async (req: Request, res: Response) => {
  try {
    const userId = await getAccountId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await logLogin(userId);
    res.status(200).json({ message: 'Login event logged successfully' });
  } catch (error) {
    console.error('Error logging login event:', error);
    res.status(500).json({ error: 'Failed to log login event' });
  }
};
