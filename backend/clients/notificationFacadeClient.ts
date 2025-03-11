import { sendNotificationEmail, sendTestNotificationEmail } from '../clients/emailClient';
import { sendTelegramMessage, sendTestTelegramNotificationToAdmins } from '../clients/telegramClient';

export type NotificationChannel = 'email' | 'telegram';

export interface NotificationOptions {
  to?: string;
  chatId?: number;
  subject?: string;
  text: string;
}

/**
 * Sends a standard (non-test) notification message via email or telegram.
 */
export async function sendNotification(
  channel: NotificationChannel,
  options: NotificationOptions
): Promise<void> {
  if (channel === 'email') {
    if (!options.to) {
      throw new Error('Email notification requires a "to" field.');
    }
    if (!options.subject) {
      throw new Error('Email notification requires a "subject" field.');
    }
    await sendNotificationEmail(options.to, options.subject, options.text);
  } else if (channel === 'telegram') {
    if (typeof options.chatId !== 'number' || options.chatId < 1) {
      throw new Error('Telegram notification requires a valid "chatId" field.');
    }
    await sendTelegramMessage(options.chatId, options.text);
  } else {
    throw new Error(`Unknown notification channel: ${channel}`);
  }
}

/**
 * Sends a "test" notification.
 * For email, you can pass specific fields (to, subject, text).
 * For telegram, this example specifically sends a test
 * to *all* Admin accounts or you can adjust to pass a chatId.
 */
export const sendTestNotification = async (channel: NotificationChannel) => {
  if (channel === 'email') {
    // Example test for a single email. You could expand to accept dynamic data
    await sendTestNotificationEmail();
  } else if (channel === 'telegram') {
    // Example test that sends to all admins
    // You might prefer to accept a chatId and text instead,
    // but this function uses the existing logic from your telegramClient
    const result = await sendTestTelegramNotificationToAdmins();
    console.log(`Test telegram notifications sent to ${result.count} admin(s).`);
  } else {
    throw new Error(`Unknown notification channel: ${channel}`);
  }
}
