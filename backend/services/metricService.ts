import TabSessionModel, { TabSession } from '@models/metrics/TabSession';
import LoginEventModel from '../models/metrics/LoginEvent';
import AccountModel from '@models/Account';
import { BadRequestError, NotFoundError } from './errors';

export const logLogin = async (userId: string) => {
  const loginEvent = {
    timestamp: new Date(),
    metadata: {
      userId,
    },
  };
  await LoginEventModel.create(loginEvent);
};

export const logTabSessionById = async (
  accountId: string,
  tabSessionData: TabSession
) => {
  const account = AccountModel.findById(accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }
  if (
    !tabSessionData ||
    !tabSessionData.course ||
    !tabSessionData.tab ||
    !tabSessionData.sessionStartTime ||
    !tabSessionData.sessionEndTime ||
    !tabSessionData.sessionDuration ||
    !tabSessionData.sessionId
  ) {
    throw new BadRequestError('Tab session data not found');
  }
  const tabSession = new TabSessionModel({
    account: accountId,
    course: tabSessionData.course,
    tab: tabSessionData.tab,
    sessionStartTime: tabSessionData.sessionStartTime,
    sessionEndTime: tabSessionData.sessionEndTime,
    sessionDuration: tabSessionData.sessionDuration,
    sessionId: tabSessionData.sessionId,
  });
  await tabSession.save();
};
