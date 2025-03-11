import { Telegraf } from 'telegraf';
import { config } from 'dotenv';
import AccountModel from '@models/Account';
import Role from '@shared/types/auth/Role';
import { sendNotification } from './notificationFacadeClient';

const env = process.env.NODE_ENV ?? 'development';
config({ path: `.env.${env}` });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_BOT_TOKEN) {
  throw new Error(
    'TELEGRAM_BOT_TOKEN is not defined in your environment variables'
  );
}

export const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

bot.start(async ctx => {
  await ctx.reply(
    'Welcome to CRISP! Please type /register <your email> to link your account.'
  );
});

bot.command('register', async ctx => {
  // e.g. /register me@example.com
  const message = ctx.message.text; // e.g. "register me@example.com"
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [cmd, userEmail] = message.split(' ');

  if (!userEmail) {
    await ctx.reply('Usage: /register <yourEmail>');
    return;
  }

  // 1. Find the account by userEmail
  // 2. If found, set account.telegramChatId = ctx.chat.id
  // 3. Save the account, respond with success/fail
  const account = await AccountModel.findOne({
    email: userEmail,
  });
  if (!account) {
    await ctx.reply('Given email is not registered with CRISP');
    return;
  }

  account.telegramChatId = ctx.chat.id;
  await account.save();
  await ctx.reply(
    'Email ' +
      userEmail +
      ' successfully linked to Telegram notifications! Do not delete this chat, the notifications will come through this chat.'
  );
  account.wantsTelegramNotifications = true;
  account.telegramNotificationType = 'daily';
  account.telegramNotificationHour = 12;
  account.telegramNotificationWeekday = 7;
  return;
});

bot.command('unlink', async ctx => {
  // 1. Find the account by chat id
  // 2. If found, set account.telegramChatId = -1;
  // 3. Save the account, respond with success/fail
  const account = await AccountModel.findOne({
    telegramChatId: ctx.chat.id,
  });
  if (!account) {
    await ctx.reply('This telegram chat is not registered with CRISP');
    return;
  }

  account.telegramChatId = -1;
  await account.save();
  await ctx.reply(
    'This chat has been unlinked from your account. Notifications will no longer come through this chat.'
  );
  return;
});

bot.help(async ctx => {
  await ctx.reply(
    'register: /register <email> - Registers the email associated to the CRISP account for telegram push notifications via this bot. \nunlink: /unlink: Unlinks this chat from CRISP, removing the id of this chat from CRISP databases.'
  );
  return;
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

export const sendTelegramMessage = async (chatId: number, text: string) => {
  try {
    return await bot.telegram.sendMessage(chatId, text);
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    throw error;
  }
};

/**
 * Sends a test Telegram notification to all admin accounts.
 */
export const sendTestTelegramNotificationToAdmins = async () => {
  // 1. Retrieve all admin accounts
  const adminAccounts = await AccountModel.find({
    role: Role.Admin,
    // Make sure they want Telegram notifications and have a chatId
    wantsTelegramNotifications: true,
    telegramChatId: { $exists: true, $ne: [null, -1] },
  });

  // 2. Build the test message (whatever message you want to send)
  const testMessage = `
Hello Admin,

This is a test Telegram notification from CRISP. 
If you received this, your Telegram integration is working!

Regards,
CRISP
  `.trim();

  // 3. Send the message to each admin
  for (const admin of adminAccounts) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chatId = (admin as any).telegramChatId;
      if (chatId === null || chatId === -1) {
        throw new Error();
      }
      await sendNotification('telegram', {
        chatId,
        text: testMessage
      });
      console.log(`Test Telegram message sent to admin with chatId: ${chatId}`);
    } catch (err) {
      console.error('Failed to send test Telegram message to admin:', err);
    }
  }

  return { count: adminAccounts.length };
};
