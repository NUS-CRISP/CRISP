import { Request, Response } from 'express';
import {
  sendTelegramMessage,
  sendTestTelegramNotificationToAdmins,
} from './../clients/telegramClient';
import { sendNotificationEmail } from './../clients/emailClient';

// File not tested because these are just test notification methods.
export const sendTestEmailController = async (req: Request, res: Response) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, text } = req.body;
    await sendNotificationEmail(to, subject, text);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
};

export const sendTestTelegramMessageController = async (
  req: Request,
  res: Response
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { chatId, text } = req.body;
    if (!chatId || !text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await sendTelegramMessage(chatId, text);
    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('Error sending telegram message:', error);
    return res.status(500).json({ error: 'Failed to send telegram message' });
  }
};

/**
 * Controller that triggers a test Telegram notification
 * to all admin accounts.
 */
export const sendTestTelegramNotificationToAdminsController = async (
  req: Request,
  res: Response
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await sendTestTelegramNotificationToAdmins();
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Error sending telegram message to admins:', error);
    return res
      .status(500)
      .json({ error: 'Failed to send telegram message to admins' });
  }
};
