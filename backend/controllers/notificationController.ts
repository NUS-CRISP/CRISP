import { Request, Response } from 'express';
import { sendNotification, sendTestNotification } from 'clients/notificationFacadeClient';

// File not tested because these are just test notification methods.
export const sendTestEmailController = async (req: Request, res: Response) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, text } = req.body;
    await sendNotification('email', {
      to,
      subject,
      text
    });
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

    const result = await sendNotification('telegram', {
      chatId,
      text
    });
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await sendTestNotification('telegram');
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Error sending telegram message to admins:', error);
    return res
      .status(500)
      .json({ error: 'Failed to send telegram message to admins' });
  }
};
