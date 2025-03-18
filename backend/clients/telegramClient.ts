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

bot.command('enable', async ctx => {
  const account = await AccountModel.findOne({
    telegramChatId: ctx.chat.id,
  });
  if (!account) {
    await ctx.reply('This telegram chat is not registered with CRISP');
    return;
  }

  account.wantsTelegramNotifications = true;
  await account.save();
  await ctx.reply('Telegram notifications have been enabled for your account.');
  return;
});

bot.command('disable', async ctx => {
  const account = await AccountModel.findOne({
    telegramChatId: ctx.chat.id,
  });
  if (!account) {
    await ctx.reply('This telegram chat is not registered with CRISP');
    return;
  }

  account.wantsTelegramNotifications = false;
  await account.save();
  await ctx.reply(
    'Telegram notifications have been disabled for your account.'
  );
  return;
});

const SETTINGS_HOURLY = 'hourly';
const SETTINGS_DAILY = 'daily';
const SETTINGS_WEEKLY = 'weekly';
const SETTINGS_CMD_USAGE =
  'Usage: /changesettings <hourly/daily/weekly> <hour of the day (24h format)> <1 (Monday) - 7 (Sunday)>';
const SETTINGS_ERR_FIRST_FIELD = `\nIncorrect first field. Must be ${SETTINGS_HOURLY}, ${SETTINGS_DAILY} or ${SETTINGS_WEEKLY}.`;
const SETTINGS_ERR_MISSING_HOUR =
  '\nMissing hour of the day to push notifications.';
const SETTINGS_ERR_INVALID_HOUR =
  '\nHour field is invalid. Input a number from 0 (midnight) to 23 (11pm)';
const SETTINGS_ERR_MISSING_DAY =
  '\nMissing day of the week to push notifications.';
const SETTINGS_ERR_INVALID_DAY =
  '\nDay field is invalid. Input a number from 1 (Monday) to 7 (Sunday)';

bot.command('changesettings', async ctx => {
  //Configures user's notification settings
  //Usage: /changesettings <hourly/daily/weekly> <hour of the day (24h format)> <1 (Monday) - 7 (Sunday)>
  //Examples:
  //  /changesettings weekly 16 2 => notifications pushed on Tuesday, at 4pm every week
  //  /changesettings daily 8 => notifications pushed at 8am every day
  //  /changesettings hourly => notifications pushed every hour

  const account = await AccountModel.findOne({
    telegramChatId: ctx.chat.id,
  });
  if (!account) {
    await ctx.reply('This telegram chat is not registered with CRISP');
    return;
  }

  const message = ctx.message.text;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [cmd, typeStr, hourStr, dayStr] = message.split(' ');

  if (!typeStr) {
    await ctx.reply(SETTINGS_CMD_USAGE);
    return;
  }

  if (
    typeStr !== SETTINGS_HOURLY &&
    typeStr !== SETTINGS_DAILY &&
    typeStr !== SETTINGS_WEEKLY
  ) {
    await ctx.reply(SETTINGS_CMD_USAGE + SETTINGS_ERR_FIRST_FIELD);
    return;
  }

  account.telegramNotificationType = typeStr;
  if (typeStr === SETTINGS_HOURLY) {
    account.save();
    await ctx.reply('Notifications set to be pushed every hour.');
    return;
  }

  if ((typeStr === SETTINGS_DAILY || typeStr === SETTINGS_WEEKLY) && !hourStr) {
    await ctx.reply(SETTINGS_CMD_USAGE + SETTINGS_ERR_MISSING_HOUR);
    return;
  }

  const notificationHour = Number(hourStr);
  if (
    (typeStr === SETTINGS_DAILY || typeStr === SETTINGS_WEEKLY) &&
    (isNaN(notificationHour) || notificationHour < 0 || notificationHour > 23)
  ) {
    await ctx.reply(SETTINGS_CMD_USAGE + SETTINGS_ERR_INVALID_HOUR);
    return;
  }

  account.telegramNotificationHour = notificationHour;
  if (typeStr === SETTINGS_DAILY) {
    account.save();
    await ctx.reply(
      `Notifications set to be pushed every day, at ${notificationHour}00hrs (24h format).`
    );
    return;
  }

  if (typeStr === SETTINGS_WEEKLY && !dayStr) {
    await ctx.reply(SETTINGS_CMD_USAGE + SETTINGS_ERR_MISSING_DAY);
    return;
  }
  const notificationDay = Number(dayStr);
  if (
    typeStr === SETTINGS_WEEKLY &&
    (isNaN(notificationDay) || notificationDay < 1 || notificationDay > 7)
  ) {
    await ctx.reply(SETTINGS_CMD_USAGE + SETTINGS_ERR_INVALID_DAY);
    return;
  }

  account.telegramNotificationWeekday = notificationDay;
  await account.save();
  await ctx.reply(
    `Notifications set to be pushed every week, on day ${notificationDay} (where 1 = Monday, ..., 7 = Sunday), at ${notificationHour}00hrs (24h format).`
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
  const adminAccounts = await AccountModel.find({
    role: Role.Admin,
    wantsTelegramNotifications: true,
    telegramChatId: { $exists: true, $ne: [null, -1] },
  });

  const testMessage = `
Hello Admin,

This is a test Telegram notification from CRISP. 
If you received this, your Telegram integration is working!

Regards,
CRISP
  `.trim();

  for (const admin of adminAccounts) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chatId = (admin as any).telegramChatId;
      if (chatId === null || chatId === -1) {
        throw new Error();
      }
      await sendNotification('telegram', {
        chatId,
        text: testMessage,
      });
      console.log(`Test Telegram message sent to admin with chatId: ${chatId}`);
    } catch (err) {
      console.error('Failed to send test Telegram message to admin:', err);
    }
  }

  return { count: adminAccounts.length };
};
