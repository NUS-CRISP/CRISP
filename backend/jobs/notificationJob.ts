import AccountModel from '@models/Account';
import Role from '@shared/types/auth/Role';
import cron from 'node-cron';
import { Team } from '../models/Team';
import { User } from '../models/User';
import InternalAssessmentModel, { InternalAssessment } from '@models/InternalAssessment';
import { getUnmarkedAssignmentsByTAId } from '../services/assessmentAssignmentSetService';
import { sendNotification, sendTestNotification } from 'clients/notificationFacadeClient';

export function isNotificationTime(
  type: string | undefined,
  hour: number | undefined,
  weekday: number | undefined,
  nowHour: number,
  nowWeekday: number
): boolean {
  if (!type || !['hourly', 'daily', 'weekly'].includes(type)) return nowHour === 0;
  switch (type) {
    case 'hourly':
      return true;
    case 'daily':
      if (!hour || hour < 0 || hour > 23) hour = 0;
      return nowHour === hour;
    case 'weekly':
      if (!hour || hour < 0 || hour > 23) hour = 0;
      if (!weekday || weekday < 1 || weekday > 7) weekday = 7;
      return nowHour === hour && nowWeekday === weekday;
  }
  return false;
}

export interface NotificationTrigger {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gatherNotificationText(account: any): Promise<string | null>;
}

const ungradedItemsTrigger: NotificationTrigger = {
  name: 'ungradedItems',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gatherNotificationText: async (account: any) => {
    const all = await InternalAssessmentModel.find();
    const parts: string[] = [];
    for (const a of all) {
      const unmarked = await getUnmarkedAssignmentsByTAId(account.user._id.toString(), a._id.toString());
      if (!unmarked.length) continue;
      const segment =
        a.granularity === 'team'
          ? convertAssignedTeamsToString(unmarked as Team[], a)
          : convertAssignedUsersToString(unmarked as User[], a);
      if (segment) parts.push(segment);
    }
    if (!parts.length) return null;
    const userName = account.user?.name ?? 'User';
    return `
Hello ${userName},

You have ungraded items:

${parts.join('\n\n')}

Regards,
CRISP
`.trim();
  }
};

const NOTIFICATION_TRIGGERS: NotificationTrigger[] = [
  ungradedItemsTrigger
];

// For the final text we combine each non-null result (or you can send separate messages)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function gatherAllTriggerText(account: any): Promise<string | null> {
  let combined = '';
  for (const trig of NOTIFICATION_TRIGGERS) {
    const text = await trig.gatherNotificationText(account);
    if (text) {
      combined += text + '\n\n'; // or format differently
    }
  }
  if (!combined.trim()) return null;
  return combined.trim();
}

function convertAssignedTeamsToString(teams: Team[], assessment: InternalAssessment) {
  if (!teams.length) return '';
  let s = `Assessment: ${assessment.assessmentName}\n`;
  teams.forEach(t => (s += `Team #${t.number}\n`));
  return s.trim();
}

function convertAssignedUsersToString(users: User[], assessment: InternalAssessment) {
  if (!users.length) return '';
  let s = `Assessment: ${assessment.assessmentName}\n`;
  users.forEach(u => (s += `${u.name}\n`));
  return s.trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendEmailNotification(account: any) {
  const text = await gatherAllTriggerText(account);
  if (!text) return;
  await sendNotification('email', {
    to: account.email,
    subject: 'CRISP: You Have Pending Notifications',
    text
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendTelegramNotification(account: any) {
  if (!account.telegramChatId || account.telegramChatId === -1) return;
  const text = await gatherAllTriggerText(account);
  if (!text) return;
  await sendNotification('telegram', {
    chatId: account.telegramChatId,
    text
  });
}

export async function runNotificationCheck() {
  const now = new Date();
  const hour = now.getHours();
  const weekday = now.getDay() === 0 ? 7 : now.getDay();

  const accounts = await AccountModel.find({
    role: { $in: [Role.TA, Role.Faculty, Role.Admin] },
    isApproved: true
  }).populate('user');

  for (const acc of accounts) {
    if (!acc.emailNotificationType) acc.emailNotificationType = 'daily';
    if (!acc.emailNotificationHour) acc.emailNotificationHour = 12;
    if (!acc.emailNotificationWeekday) acc.emailNotificationWeekday = 7;

    if (acc.wantsEmailNotifications) {
      if (
        isNotificationTime(
          acc.emailNotificationType,
          acc.emailNotificationHour,
          acc.emailNotificationWeekday,
          hour,
          weekday
        )
      ) {
        await sendEmailNotification(acc);
      }
    }

    if (!acc.telegramNotificationType) acc.telegramNotificationType = 'daily';
    if (!acc.telegramNotificationHour) acc.telegramNotificationHour = 12;
    if (!acc.telegramNotificationWeekday) acc.telegramNotificationWeekday = 7;

    if (acc.wantsTelegramNotifications && acc.telegramChatId && acc.telegramChatId !== -1) {
      if (
        isNotificationTime(
          acc.telegramNotificationType,
          acc.telegramNotificationHour,
          acc.telegramNotificationWeekday,
          hour,
          weekday
        )
      ) {
        await sendTelegramNotification(acc);
      }
    }
  }
}

async function notifyOnStartup() {
  const admins = await AccountModel.find({ role: Role.Admin, isApproved: true }).populate('user');
  for (const a of admins) {
    if (a.wantsEmailNotifications) await sendEmailNotification(a);
    if (a.wantsTelegramNotifications && a.telegramChatId && a.telegramChatId !== -1) {
      await sendTelegramNotification(a);
    }
  }
}

export function setupNotificationJob() {
  cron.schedule('0 * * * *', async () => {
    console.log('Hourly notification check:', new Date().toString());
    try {
      await runNotificationCheck();
    } catch (err) {
      console.error('Notification job error:', err);
    }
  });

  if (process.env.RUN_NOTIFICATION_JOB === 'true' || process.env.RUN_JOB_NOW === 'true') {
    console.log('Running notification check now...');
    notifyOnStartup();
  }

  if (process.env.TEST_EMAIL_ON_NOTIFICATION_JOB_START === 'true') {
    console.log('Testing email on startup...');
    sendTestNotification('email').catch(err => {
      console.error('Error sending test email:', err);
    });
  }
}

export default setupNotificationJob;
