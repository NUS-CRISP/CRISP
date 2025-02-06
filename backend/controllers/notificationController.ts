// Controller file for testing notification clients.
// Not meant for general use, use client through jobs instead.
import { sendTestNotificationEmail } from './../clients/emailClient';
import { Request, Response } from 'express';

export const sendTestEmailController = async (req: Request, res: Response) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await sendTestNotificationEmail();
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
