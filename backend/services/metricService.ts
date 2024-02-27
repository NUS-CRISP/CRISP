import LoginEventModel from '../models/metrics/LoginEvent';

export const logLogin = async (userId: string) => {
  const loginEvent = {
    timestamp: new Date(),
    metadata: {
      userId,
    },
  };
  await LoginEventModel.create(loginEvent);
};
