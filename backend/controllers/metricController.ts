import { Request, Response } from 'express';
import { logLogin } from '../services/metricService';

export const logLoginEvent = async (
  req: Request<{}, {}, { userId: string }>,
  res: Response
) => {
  try {
    const userId = req.body.userId;
    await logLogin(userId);
    res.status(200).json({ message: 'Login event logged successfully' });
  } catch (error) {
    console.error('Error logging login event:', error);
    res.status(500).json({ error: 'Failed to log login event' });
  }
};
