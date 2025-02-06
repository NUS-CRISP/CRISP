import AccountModel from '@models/Account';
import Role from '@shared/types/auth/Role';
import { sendNotificationEmail, sendTestNotificationEmail } from './../clients/emailClient';
import cron from 'node-cron';
import { Team } from '../models/Team';
import { User } from '../models/User';
import InternalAssessmentModel, { InternalAssessment } from '@models/InternalAssessment';
import { getUnmarkedAssignmentsByTAId } from 'services/assessmentAssignmentSetService';

const convertAssignedTeamsToString = (assignedTeams: Team[], assessment: InternalAssessment): string => {
  if (assignedTeams.length === 0) {
    return '';
  }

  let result = `Assessment: ${assessment.assessmentName}\n`;
  assignedTeams.forEach((team) => {
    result += `Team #${team.number}\n`;
  });

  return result.trim();
}

const convertAssignedUsersToString = (assignedUsers: User[], assessment: InternalAssessment): string => {
  if (assignedUsers.length === 0) {
    return '';
  }

  let result = `Assessment: ${assessment.assessmentName}\n`;
  assignedUsers.forEach((user) => {
    result += `${user.name}\n`;
  });

  return result.trim();
}

async function notifyAccountsThroughEmail() {
  const accountsThatWantEmailNotifications = await AccountModel.find({
    role: { $in: [Role.TA, Role.Faculty, Role.Admin] },
    wantsEmailNotifications: true,
  }).populate('user');

  const allInternalAssessments = await InternalAssessmentModel.find(); // Consider limiting by date

  for (const accountToCheck of accountsThatWantEmailNotifications) {
    const summaries: string[] = [];

    for (const internalAssessment of allInternalAssessments) {
      const unmarkedAssignments = await getUnmarkedAssignmentsByTAId(
        accountToCheck.user._id.toString(),
        internalAssessment._id.toString()
      );
      console.log('Number of unmarked assignments:' + unmarkedAssignments.length);

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
    const username = (accountToCheck.user as any).name

    const emailBodyFormatted = `
Hello ${username},

This is a reminder that you have outstanding assigned students/teams that have not been graded. Below is a list of unmarked items grouped by assessment:

${summaries.join('\n\n')}

If you have any questions, please contact the CRISP support team.

Regards,
CRISP
    `.trim();

    // Send the email
    const emailToSend = {
      to: accountToCheck.email,
      subject: 'CRISP: You Have Pending Unmarked Assessments',
      text: emailBodyFormatted,
    };

    await sendNotificationEmail(emailToSend.to, emailToSend.subject, emailToSend.text);
  }
}

async function notifyAccountsThroughTelegram() {
// TODO: Sprint 3
}

async function notificationScanAndSend() {
  await notifyAccountsThroughEmail();
  await notifyAccountsThroughTelegram();
}

async function notificationSendTestEmail() {
  await sendTestNotificationEmail();
}


export const setupNotificationJob = () => {
  // Schedule the job to run every day at midnight
  cron.schedule('0 2 * * *', async () => {
    console.log(
      'Running notificationScanAndSend job:',
      new Date().toString()
    );
    try {
      await notificationScanAndSend();
    } catch (err) {
      console.error('Error in cron job notificationScanAndSend:', err);
    }
  });

  // To run the job immediately for testing
  if (process.env.RUN_NOTIFICATION_JOB === 'true' || process.env.RUN_JOB_NOW === 'true') {
    console.log('Running notificationScanAndSend job');
    notificationScanAndSend().catch(err => {
      console.error('Error running job manually:', err);
    });
  }

  // To test if job can send email correctly (Config email settings in .env)
  if (process.env.TEST_EMAIL_ON_NOTIFICATION_JOB_START === 'true') {
    console.log('Testing Ability for Notification Job to send email');
    notificationSendTestEmail().catch(err => {
      console.error('Error in notification job sending email:', err);
    });
  }
};

export default setupNotificationJob;
