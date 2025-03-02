import AccountModel from '@models/Account';
import Role from '@shared/types/auth/Role';
import {
  sendNotificationEmail,
  sendTestNotificationEmail,
} from '../clients/emailClient';
import cron from 'node-cron';
import { Team } from '../models/Team';
import { User } from '../models/User';
import InternalAssessmentModel, {
  InternalAssessment,
} from '@models/InternalAssessment';
import { getUnmarkedAssignmentsByTAId } from 'services/assessmentAssignmentSetService';
import { sendTelegramMessage } from '../clients/telegramClient';

/**
 * Returns true if it's time to send a notification for a given schedule.
 * @param type - 'hourly', 'daily', or 'weekly'
 * @param hour - The hour (0-23) the user wants to receive the notification.
 * @param weekday - The weekday (1-7, Mon=1...Sun=7) for weekly notifications.
 * @param nowHour - Current hour (0-23).
 * @param nowWeekday - Current weekday (1-7, Mon=1...Sun=7).
 * @returns boolean
 */
export const isNotificationTime = (
  type: string | undefined,
  hour: number | undefined,
  weekday: number | undefined,
  nowHour: number,
  nowWeekday: number
): boolean => {
  // If missing or invalid type, default to daily at midnight
  if (!type || !['hourly', 'daily', 'weekly'].includes(type)) {
    return nowHour === 0; // midnight
  }

  switch (type) {
    case 'hourly':
      // If user says "hourly", we send once each hour
      return true;

    case 'daily':
      // Check if user-provided hour is valid; if not, default to 0
      if (hour === null || hour === undefined || hour < 0 || hour > 23) {
        hour = 0;
      }
      return nowHour === hour;

    case 'weekly':
      // For weekly, we check hour & weekday
      if (hour === null || hour === undefined || hour < 0 || hour > 23) {
        hour = 0;
      }
      if (
        weekday === null ||
        weekday === undefined ||
        weekday < 1 ||
        weekday > 7
      ) {
        // Default to Sunday if invalid
        weekday = 7;
      }
      return nowHour === hour && nowWeekday === weekday;
  }

  // Should never get here, but just in case
  return false;
};

// Reuse your existing converters
const convertAssignedTeamsToString = (
  assignedTeams: Team[],
  assessment: InternalAssessment
): string => {
  if (assignedTeams.length === 0) return '';
  let result = `Assessment: ${assessment.assessmentName}\n`;
  assignedTeams.forEach(team => {
    result += `Team #${team.number}\n`;
  });
  return result.trim();
};

const convertAssignedUsersToString = (
  assignedUsers: User[],
  assessment: InternalAssessment
): string => {
  if (assignedUsers.length === 0) return '';
  let result = `Assessment: ${assessment.assessmentName}\n`;
  assignedUsers.forEach(user => {
    result += `${user.name}\n`;
  });
  return result.trim();
};

/**
 * Send an email notification to a single account.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const notifySingleAccountViaEmail = async (
  account: any /* or your Account type */
) => {
  const allInternalAssessments = await InternalAssessmentModel.find();
  const summaries: string[] = [];

  for (const internalAssessment of allInternalAssessments) {
    const unmarkedAssignments = await getUnmarkedAssignmentsByTAId(
      account.user._id.toString(),
      internalAssessment._id.toString()
    );

    let summary = '';
    if (internalAssessment.granularity === 'team') {
      summary = convertAssignedTeamsToString(
        unmarkedAssignments as Team[],
        internalAssessment
      );
    } else {
      summary = convertAssignedUsersToString(
        unmarkedAssignments as User[],
        internalAssessment
      );
    }

    if (summary) {
      summaries.push(summary);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const username = (account.user as any).name ?? 'User';
  const emailBodyFormatted = `
Hello ${username},

This is a reminder that you have outstanding assigned students/teams that have not been graded. Below is a list of unmarked items grouped by assessment:

${summaries.join('\n\n')}

If you have any questions, please contact the CRISP support team.

Regards,
CRISP
  `.trim();

  await sendNotificationEmail(
    account.email,
    'CRISP: You Have Pending Unmarked Assessments',
    emailBodyFormatted
  );
};

/**
 * Send a Telegram notification to a single account.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const notifySingleAccountViaTelegram = async (
  account: any /* or your Account type */
) => {
  if (account.telegramChatId === null || account.telegramChatId === -1) return;
  const allInternalAssessments = await InternalAssessmentModel.find();
  const summaries: string[] = [];

  for (const internalAssessment of allInternalAssessments) {
    const unmarkedAssignments = await getUnmarkedAssignmentsByTAId(
      account.user._id.toString(),
      internalAssessment._id.toString()
    );

    let summary = '';
    if (internalAssessment.granularity === 'team') {
      summary = convertAssignedTeamsToString(
        unmarkedAssignments as Team[],
        internalAssessment
      );
    } else {
      summary = convertAssignedUsersToString(
        unmarkedAssignments as User[],
        internalAssessment
      );
    }

    if (summary) {
      summaries.push(summary);
    }
  }

  if (summaries.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const username = (account.user as any).name ?? 'User';
    const telegramMessage = `
Hello ${username},

This is a reminder that you have outstanding assigned students/teams that have not been graded.

Below is a list of unmarked items grouped by assessment:

${summaries.join('\n\n')}

If you have any questions, please contact the CRISP support team.

Regards,
CRISP
    `.trim();

    await sendTelegramMessage(account.telegramChatId, telegramMessage);
  }
};

const notifyOnStartup = async () => {
  const allAccounts = await AccountModel.find({
    role: { $in: [Role.Admin] },
    isApproved: true,
  }).populate('user');

  for (const account of allAccounts) {
    // 1. Check if they want email notifications
    if (account.wantsEmailNotifications) {
      await notifySingleAccountViaEmail(account);
    }

    // 2. Check if they want Telegram notifications
    if (account.wantsTelegramNotifications && account.telegramChatId) {
      await notifySingleAccountViaTelegram(account);
    }
  }
};

/**
 * The main cron job: runs every hour on the hour (minute 0).
 */
export const setupNotificationJob = () => {
  cron.schedule('0 * * * *', async () => {
    console.log('Running hourly notification check:', new Date().toString());
    try {
      const now = new Date();
      const currentHour = now.getHours(); // 0-23
      // JS getDay() => Sunday=0, Monday=1, ... Saturday=6
      // If you need Monday=1..Sunday=7, transform accordingly:
      const rawDay = now.getDay() === 0 ? 7 : now.getDay();
      const currentWeekday = rawDay; // Monday=1..Sunday=7

      // Find all relevant accounts (TAs, Faculty, Admins, etc.)
      const allAccounts = await AccountModel.find({
        role: { $in: [Role.TA, Role.Faculty, Role.Admin] },
        isApproved: true,
      }).populate('user');

      for (const account of allAccounts) {
        if (!account.wantsEmailNotifications)
          account.wantsEmailNotifications = false;
        if (!account.emailNotificationType)
          account.emailNotificationType = 'daily';
        if (!account.emailNotificationHour) account.emailNotificationHour = 12;
        if (!account.emailNotificationWeekday)
          account.emailNotificationWeekday = 7;

        // 1. Check if they want email notifications
        if (account.wantsEmailNotifications) {
          const shouldSendEmail = isNotificationTime(
            account.emailNotificationType,
            account.emailNotificationHour,
            account.emailNotificationWeekday,
            currentHour,
            currentWeekday
          );
          if (shouldSendEmail) {
            await notifySingleAccountViaEmail(account);
          }
        }

        // 2. Check if they want Telegram notifications
        if (
          account.wantsTelegramNotifications &&
          account.telegramChatId &&
          account.telegramChatId !== -1
        ) {
          const shouldSendTelegram = isNotificationTime(
            account.telegramNotificationType,
            account.telegramNotificationHour,
            account.telegramNotificationWeekday,
            currentHour,
            currentWeekday
          );
          if (shouldSendTelegram) {
            await notifySingleAccountViaTelegram(account);
          }
        }
      }
    } catch (err) {
      console.error('Error in cron job for notification:', err);
    }
  });

  // For testing: run the job immediately if needed
  if (
    process.env.RUN_NOTIFICATION_JOB === 'true' ||
    process.env.RUN_JOB_NOW === 'true'
  ) {
    console.log('Running notifyOnStartup job now...');
    notifyOnStartup();
  }

  // Optionally send a test email on startup
  if (process.env.TEST_EMAIL_ON_NOTIFICATION_JOB_START === 'true') {
    console.log('Testing ability for Notification Job to send email...');
    sendTestNotificationEmail().catch(err => {
      console.error('Error in notification job sending email:', err);
    });
  }
};

export default setupNotificationJob;
