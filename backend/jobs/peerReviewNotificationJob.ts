import AccountModel, { Account } from '@models/Account';
import CourseModel from '@models/Course';
import NotificationDispatchLogModel from '@models/NotificationDispatchLog';
import PeerReviewModel, { PeerReview } from '@models/PeerReview';
import PeerReviewSubmissionModel, {
  PeerReviewSubmission,
} from '@models/PeerReviewSubmission';
import TeamModel from '@models/Team';
import { Types } from 'mongoose';
import cron from 'node-cron';
import { sendNotification } from '../clients/notificationFacadeClient';
import { PeerReviewGradingTaskModel } from '../models/PeerReviewGradingTask';

type EventType =
  | 'PR_STARTS_IN_X_DAYS'
  | 'PR_STARTED'
  | 'PR_ENDS_IN_X_DAYS'
  | 'PR_ENDED'
  | 'PR_GRADING_STARTED'
  | 'PR_GRADING_ENDS_IN_X_DAYS'
  | 'DRAFTS_NEAR_DEADLINE'
  | 'TA_GRADING_TASKS_ASSIGNED';

const DAY_MS = 24 * 60 * 60 * 1000;

const START_REMINDER_DAYS = [7, 3, 1];
const END_REMINDER_DAYS = [3, 1];
const GRADING_END_REMINDER_DAYS = [3, 1];
const DRAFT_NEAR_DEADLINE_DAYS = [2, 1];

const formatDateLocal = (d: Date) =>
  d.toLocaleString('en-SG', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const localDateOnly = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

const daysUntil = (target: Date, now: Date) => {
  const targetDate = localDateOnly(target).getTime();
  const nowDate = localDateOnly(now).getTime();
  return Math.floor((targetDate - nowDate) / DAY_MS);
};

const isWithinFirstDayAfter = (now: Date, target: Date) => {
  const delta = now.getTime() - target.getTime();
  return delta >= 0 && delta < DAY_MS;
};

const toObjectIdSet = (ids: Array<Types.ObjectId | string>) =>
  Array.from(new Set(ids.map(id => id.toString()))).map(
    id => new Types.ObjectId(id)
  );

const isTelegramConnected = (account: Account) =>
  typeof account.telegramChatId === 'number' && account.telegramChatId > 0;

const dispatchDeduped = async (
  eventType: EventType,
  windowKey: string,
  peerReviewId: Types.ObjectId,
  account: Account,
  subject: string,
  text: string
) => {
  const accountId = new Types.ObjectId(account._id.toString());

  const tryChannel = async (channel: 'email' | 'telegram') => {
    const exists = await NotificationDispatchLogModel.exists({
      eventType,
      peerReviewId,
      accountId,
      channel,
      windowKey,
    });

    if (exists) return;

    if (channel === 'email') {
      await sendNotification('email', {
        to: account.email,
        subject,
        text,
      });
    } else {
      await sendNotification('telegram', {
        chatId: account.telegramChatId,
        text,
      });
    }

    await NotificationDispatchLogModel.create({
      eventType,
      peerReviewId,
      accountId,
      channel,
      windowKey,
      sentAt: new Date(),
    });
  };

  if (account.wantsEmailNotifications) {
    await tryChannel('email');
  }

  if (account.wantsTelegramNotifications && isTelegramConnected(account)) {
    await tryChannel('telegram');
  }
};

const mapAccountsByUserId = async (userIds: string[]) => {
  if (!userIds.length) return new Map<string, Account>();
  const accounts = await AccountModel.find({
    user: { $in: toObjectIdSet(userIds) },
    isApproved: true,
  });
  const m = new Map<string, Account>();
  for (const acc of accounts) {
    m.set(acc.user.toString(), acc);
  }
  return m;
};

const mapTeamMembers = async (teamSetId: Types.ObjectId) => {
  const teams = await TeamModel.find({ teamSet: teamSetId }).select(
    '_id members'
  );
  const teamToMembers = new Map<string, string[]>();
  const studentUserIds = new Set<string>();

  for (const team of teams) {
    const members = (team.members ?? []).map(m => m.toString());
    teamToMembers.set(team._id.toString(), members);
    for (const memberId of members) {
      studentUserIds.add(memberId);
    }
  }

  return {
    teamToMembers,
    studentUserIds: Array.from(studentUserIds),
  };
};

const countRemainingReviewsByUser = (
  submissions: Array<
    Pick<
      PeerReviewSubmission,
      'reviewerKind' | 'reviewerUserId' | 'reviewerTeamId' | 'status'
    >
  >,
  teamToMembers: Map<string, string[]>
) => {
  const remaining = new Map<string, number>();

  for (const s of submissions) {
    if (s.status === 'Submitted') continue;

    if (
      (s.reviewerKind === 'Student' || s.reviewerKind === 'TA') &&
      s.reviewerUserId
    ) {
      const userId = s.reviewerUserId.toString();
      remaining.set(userId, (remaining.get(userId) ?? 0) + 1);
      continue;
    }

    if (s.reviewerKind === 'Team' && s.reviewerTeamId) {
      const members = teamToMembers.get(s.reviewerTeamId.toString()) ?? [];
      for (const userId of members) {
        remaining.set(userId, (remaining.get(userId) ?? 0) + 1);
      }
    }
  }

  return remaining;
};

const countDraftReviewsByUser = (
  submissions: Array<
    Pick<
      PeerReviewSubmission,
      'reviewerKind' | 'reviewerUserId' | 'reviewerTeamId' | 'status'
    >
  >,
  teamToMembers: Map<string, string[]>
) => {
  const drafts = new Map<string, number>();

  for (const s of submissions) {
    if (s.status !== 'Draft') continue;

    if (
      (s.reviewerKind === 'Student' || s.reviewerKind === 'TA') &&
      s.reviewerUserId
    ) {
      const userId = s.reviewerUserId.toString();
      drafts.set(userId, (drafts.get(userId) ?? 0) + 1);
      continue;
    }

    if (s.reviewerKind === 'Team' && s.reviewerTeamId) {
      const members = teamToMembers.get(s.reviewerTeamId.toString()) ?? [];
      for (const userId of members) {
        drafts.set(userId, (drafts.get(userId) ?? 0) + 1);
      }
    }
  }

  return drafts;
};

const sendLifecycleNotifications = async (
  peerReview: PeerReview,
  now: Date,
  courseCode: string,
  courseName: string,
  facultyAccounts: Account[],
  studentAccounts: Account[],
  taAccounts: Account[],
  remainingByUser: Map<string, number>,
  totalRemainingReviews: number,
  taRemainingToReview: Map<string, number>,
  taRemainingToGrade: Map<string, number>
) => {
  const title = peerReview.title;

  const daysToStart = daysUntil(peerReview.startDate, now);
  if (START_REMINDER_DAYS.includes(daysToStart) && now < peerReview.startDate) {
    const subject = `CRISP: Peer review starts in ${daysToStart} day(s)`;
    const text = [
      'Hello,',
      '',
      `Peer review "${title}" for ${courseCode}: ${courseName} starts in ${daysToStart} day(s).`,
      `Start: ${formatDateLocal(peerReview.startDate)}`,
      `End: ${formatDateLocal(peerReview.endDate)}`,
      '',
      'Regards,',
      'CRISP',
    ].join('\n');

    for (const acc of [...facultyAccounts, ...studentAccounts]) {
      await dispatchDeduped(
        'PR_STARTS_IN_X_DAYS',
        `d-${daysToStart}`,
        peerReview._id,
        acc,
        subject,
        text
      );
    }
  }

  if (isWithinFirstDayAfter(now, peerReview.startDate)) {
    const subject = 'CRISP: Peer review has started';
    const text = [
      'Hello,',
      '',
      `Peer review "${title}" for ${courseCode}: ${courseName} has started.`,
      `End: ${formatDateLocal(peerReview.endDate)}`,
      '',
      'Regards,',
      'CRISP',
    ].join('\n');

    for (const acc of [...facultyAccounts, ...studentAccounts]) {
      await dispatchDeduped(
        'PR_STARTED',
        'once',
        peerReview._id,
        acc,
        subject,
        text
      );
    }
  }

  const daysToEnd = daysUntil(peerReview.endDate, now);
  if (END_REMINDER_DAYS.includes(daysToEnd) && now < peerReview.endDate) {
    for (const acc of studentAccounts) {
      const userId = acc.user.toString();
      const myRemaining = remainingByUser.get(userId) ?? 0;
      const subject = `CRISP: Peer review ends in ${daysToEnd} day(s)`;
      const text = [
        'Hello,',
        '',
        `Peer review "${title}" for ${courseCode}: ${courseName} ends in ${daysToEnd} day(s).`,
        `You still have ${myRemaining} review(s) remaining to complete.`,
        `End: ${formatDateLocal(peerReview.endDate)}`,
        '',
        'Regards,',
        'CRISP',
      ].join('\n');

      await dispatchDeduped(
        'PR_ENDS_IN_X_DAYS',
        `d-${daysToEnd}`,
        peerReview._id,
        acc,
        subject,
        text
      );
    }

    for (const acc of facultyAccounts) {
      const subject = `CRISP: Peer review ends in ${daysToEnd} day(s)`;
      const text = [
        'Hello,',
        '',
        `Peer review "${title}" for ${courseCode}: ${courseName} ends in ${daysToEnd} day(s).`,
        `There are currently ${totalRemainingReviews} review submission(s) still not submitted.`,
        `End: ${formatDateLocal(peerReview.endDate)}`,
        '',
        'Regards,',
        'CRISP',
      ].join('\n');

      await dispatchDeduped(
        'PR_ENDS_IN_X_DAYS',
        `d-${daysToEnd}`,
        peerReview._id,
        acc,
        subject,
        text
      );
    }
  }

  if (isWithinFirstDayAfter(now, peerReview.endDate)) {
    const subject = 'CRISP: Peer review has ended';
    const text = [
      'Hello,',
      '',
      `Peer review "${title}" for ${courseCode}: ${courseName} has ended.`,
      '',
      'Regards,',
      'CRISP',
    ].join('\n');

    for (const acc of [...facultyAccounts, ...studentAccounts]) {
      await dispatchDeduped(
        'PR_ENDED',
        'once',
        peerReview._id,
        acc,
        subject,
        text
      );
    }
  }

  if (
    peerReview.gradingStartDate &&
    isWithinFirstDayAfter(now, peerReview.gradingStartDate)
  ) {
    const subject = 'CRISP: Peer review grading period has started';
    const text = [
      'Hello TA,',
      '',
      `Grading period for peer review "${title}" (${courseCode}: ${courseName}) has started.`,
      peerReview.gradingEndDate
        ? `Grading end: ${formatDateLocal(peerReview.gradingEndDate)}`
        : 'No grading end date has been configured.',
      '',
      'Regards,',
      'CRISP',
    ].join('\n');

    for (const acc of taAccounts) {
      await dispatchDeduped(
        'PR_GRADING_STARTED',
        'once',
        peerReview._id,
        acc,
        subject,
        text
      );
    }
  }

  if (peerReview.gradingEndDate) {
    const daysToGradingEnd = daysUntil(peerReview.gradingEndDate, now);
    if (
      GRADING_END_REMINDER_DAYS.includes(daysToGradingEnd) &&
      now < peerReview.gradingEndDate
    ) {
      for (const acc of taAccounts) {
        const userId = acc.user.toString();
        const remainingReviews = taRemainingToReview.get(userId) ?? 0;
        const remainingGradingTasks = taRemainingToGrade.get(userId) ?? 0;

        const subject = `CRISP: Peer review grading ends in ${daysToGradingEnd} day(s)`;
        const text = [
          'Hello TA,',
          '',
          `Grading period for peer review "${title}" (${courseCode}: ${courseName}) ends in ${daysToGradingEnd} day(s).`,
          `Your remaining review submission(s): ${remainingReviews}.`,
          `Your remaining grading task(s): ${remainingGradingTasks}.`,
          `Grading end: ${formatDateLocal(peerReview.gradingEndDate)}`,
          '',
          'Regards,',
          'CRISP',
        ].join('\n');

        await dispatchDeduped(
          'PR_GRADING_ENDS_IN_X_DAYS',
          `d-${daysToGradingEnd}`,
          peerReview._id,
          acc,
          subject,
          text
        );
      }
    }
  }
};

const sendDraftNearDeadlineNotifications = async (
  peerReview: PeerReview,
  now: Date,
  courseCode: string,
  courseName: string,
  accountsByUserId: Map<string, Account>,
  draftByUser: Map<string, number>
) => {
  const daysToEnd = daysUntil(peerReview.endDate, now);
  if (!DRAFT_NEAR_DEADLINE_DAYS.includes(daysToEnd)) return;
  if (now >= peerReview.endDate) return;

  for (const [userId, draftCount] of draftByUser.entries()) {
    if (draftCount <= 0) continue;
    const acc = accountsByUserId.get(userId);
    if (!acc) continue;

    const subject = 'CRISP: You have unsubmitted draft reviews near deadline';
    const text = [
      'Hello,',
      '',
      `Peer review "${peerReview.title}" (${courseCode}: ${courseName}) ends in ${daysToEnd} day(s).`,
      `You currently have ${draftCount} draft review(s) that are not submitted.`,
      `Deadline: ${formatDateLocal(peerReview.endDate)}`,
      '',
      'Regards,',
      'CRISP',
    ].join('\n');

    await dispatchDeduped(
      'DRAFTS_NEAR_DEADLINE',
      `day-${localDateOnly(now).toISOString()}-d-${daysToEnd}`,
      peerReview._id,
      acc,
      subject,
      text
    );
  }
};

const sendTAGradingTasksAssignedNotifications = async (
  peerReview: PeerReview,
  now: Date,
  courseCode: string,
  courseName: string,
  taAccountsByUserId: Map<string, Account>
) => {
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const recentTasks = await PeerReviewGradingTaskModel.find({
    peerReviewId: peerReview._id,
    createdAt: { $gte: oneHourAgo, $lte: now },
  }).select('grader');

  if (!recentTasks.length) return;

  const newTaskCountByTA = new Map<string, number>();
  for (const task of recentTasks) {
    const graderId = task.grader.toString();
    newTaskCountByTA.set(graderId, (newTaskCountByTA.get(graderId) ?? 0) + 1);
  }

  const hourKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}`;

  for (const [taUserId, count] of newTaskCountByTA.entries()) {
    const taAcc = taAccountsByUserId.get(taUserId);
    if (!taAcc) continue;

    const subject = 'CRISP: TA grading tasks assigned';
    const text = [
      'Hello TA,',
      '',
      `You have been assigned ${count} new grading task(s) for peer review "${peerReview.title}" (${courseCode}: ${courseName}).`,
      '',
      'Regards,',
      'CRISP',
    ].join('\n');

    await dispatchDeduped(
      'TA_GRADING_TASKS_ASSIGNED',
      hourKey,
      peerReview._id,
      taAcc,
      subject,
      text
    );
  }
};

export const runPeerReviewNotificationCheck = async () => {
  const now = new Date();

  const lowerBound = new Date(now.getTime() - 14 * DAY_MS);

  const peerReviews = await PeerReviewModel.find({
    $or: [
      { startDate: { $gte: lowerBound } },
      { endDate: { $gte: lowerBound } },
      { gradingStartDate: { $gte: lowerBound } },
      { gradingEndDate: { $gte: lowerBound } },
    ],
  }).select(
    '_id title course teamSetId startDate endDate gradingStartDate gradingEndDate taAssignments'
  );

  for (const pr of peerReviews) {
    const course = await CourseModel.findById(pr.course).select(
      'code name faculty TAs'
    );
    if (!course) continue;

    const { teamToMembers, studentUserIds } = await mapTeamMembers(
      pr.teamSetId
    );

    const facultyUserIds = (course.faculty ?? []).map(id => id.toString());
    const taUserIds = (course.TAs ?? []).map(id => id.toString());

    const allRelevantUserIds = Array.from(
      new Set([...facultyUserIds, ...taUserIds, ...studentUserIds])
    );
    const accountsByUserId = await mapAccountsByUserId(allRelevantUserIds);

    const facultyAccounts = facultyUserIds
      .map(id => accountsByUserId.get(id))
      .filter((x): x is Account => Boolean(x));
    const studentAccounts = studentUserIds
      .map(id => accountsByUserId.get(id))
      .filter((x): x is Account => Boolean(x));
    const taAccounts = taUserIds
      .map(id => accountsByUserId.get(id))
      .filter((x): x is Account => Boolean(x));

    const taAccountsByUserId = new Map<string, Account>();
    for (const acc of taAccounts) {
      taAccountsByUserId.set(acc.user.toString(), acc);
    }

    const submissions = await PeerReviewSubmissionModel.find({
      peerReviewId: pr._id,
    }).select('reviewerKind reviewerUserId reviewerTeamId status');

    const remainingByUser = countRemainingReviewsByUser(
      submissions,
      teamToMembers
    );
    const draftByUser = countDraftReviewsByUser(submissions, teamToMembers);

    const taRemainingToReview = new Map<string, number>();
    for (const submission of submissions) {
      if (submission.reviewerKind !== 'TA' || !submission.reviewerUserId)
        continue;
      if (submission.status === 'Submitted') continue;
      const userId = submission.reviewerUserId.toString();
      taRemainingToReview.set(
        userId,
        (taRemainingToReview.get(userId) ?? 0) + 1
      );
    }

    const taRemainingToGrade = new Map<string, number>();
    const gradingTasks = await PeerReviewGradingTaskModel.find({
      peerReviewId: pr._id,
      status: { $ne: 'Completed' },
    }).select('grader status');
    for (const task of gradingTasks) {
      const graderId = task.grader.toString();
      taRemainingToGrade.set(
        graderId,
        (taRemainingToGrade.get(graderId) ?? 0) + 1
      );
    }

    const totalRemainingReviews = submissions.filter(
      s => s.status !== 'Submitted'
    ).length;

    await sendLifecycleNotifications(
      pr,
      now,
      course.code,
      course.name,
      facultyAccounts,
      studentAccounts,
      taAccounts,
      remainingByUser,
      totalRemainingReviews,
      taRemainingToReview,
      taRemainingToGrade
    );

    await sendDraftNearDeadlineNotifications(
      pr,
      now,
      course.code,
      course.name,
      accountsByUserId,
      draftByUser
    );

    await sendTAGradingTasksAssignedNotifications(
      pr,
      now,
      course.code,
      course.name,
      taAccountsByUserId
    );
  }
};

export const setupPeerReviewNotificationJob = () => {
  const enabled = process.env.RUN_PEER_REVIEW_NOTIFICATION_JOB !== 'false';
  if (!enabled) {
    console.log('Peer review notification job is disabled.');
    return;
  }

  cron.schedule('15 * * * *', async () => {
    console.log(
      'Hourly peer review notification check:',
      new Date().toString()
    );
    try {
      await runPeerReviewNotificationCheck();
    } catch (error) {
      console.error('Peer review notification job error:', error);
    }
  });

  if (
    process.env.RUN_PEER_REVIEW_NOTIFICATION_JOB_NOW === 'true' ||
    process.env.RUN_JOB_NOW === 'true'
  ) {
    console.log('Running peer review notification check now...');
    runPeerReviewNotificationCheck().catch(error => {
      console.error('Peer review notification immediate run failed:', error);
    });
  }
};

export default setupPeerReviewNotificationJob;
