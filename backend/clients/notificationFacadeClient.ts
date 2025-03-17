import AccountModel from '@models/Account';
import {
  sendNotificationEmail,
  sendTestNotificationEmail,
} from '../clients/emailClient';
import {
  sendTelegramMessage,
  sendTestTelegramNotificationToAdmins,
} from '../clients/telegramClient';

export type NotificationChannel = 'email' | 'telegram';

export interface NotificationOptions {
  to?: string;
  chatId?: number;
  subject?: string;
  text: string;
}

/**
 * Sends a standard (non-test) notification message via email or telegram.
 * Usage:
 * channel: string, either 'email' or 'telegram'
 * options:
 *  if email channel,
 *   {
 *     to: email to send to,
 *     subject: email's subject,
 *     text: email's body
 *   }
 *  if telegram channel,
 *   {
 *     chatId: user's chatId to send to (field of in their account),
 *     text: message to send via telegram.
 *   }
 *
 * Warnings:
 * 1. This facade only takes care of sending the email/telegram message.
 * It does not care about the user's notification settings. Please make sure
 * that the user has enabled notifications for the channel before calling
 * this function. Refer to ../jobs/notificationJob.ts for how to check permissions.
 * 2. Mismatched fields in options will just be ignored.
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
 * Checks if the given account's user wants notifications.
 * Notification type determined by channel.
 * @param channel Notification type to check permissions of.
 * Either 'email' or 'telegram'.
 * @param accountId Account ID of the user to check.
 * @returns true if account wants notifications. False otherwise,
 * and false if account not found or channel is invalid.
 */
export const checkUserWantsNotification = async (
  channel: NotificationChannel,
  accountId: string
) => {
  const account = await AccountModel.findById(accountId);
  if (!account) return false;
  switch (channel) {
    case 'email':
      return account.wantsEmailNotifications || false;
    case 'telegram':
      return account.wantsTelegramNotifications || false;
    default:
      return false;
  }
};

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
    console.log(
      `Test telegram notifications sent to ${result.count} admin(s).`
    );
  } else {
    throw new Error(`Unknown notification channel: ${channel}`);
  }
};
