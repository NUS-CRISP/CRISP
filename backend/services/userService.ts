import AccountModel from '@models/Account';
import UserModel from '@models/User';
import { Profile } from '@shared/types/Profile';
import { BadRequestError, NotFoundError } from './errors';

export const editUser = async (
  accountId: string,
  userId: string,
  updateData: Record<string, unknown>
) => {
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }
  if (account.role !== 'admin' && account.role !== 'Faculty member') {
    throw new BadRequestError('Unauthorized');
  }
  const updatedUser = await UserModel.findByIdAndUpdate(userId, updateData, {
    new: true,
  });
  if (!updatedUser) {
    throw new NotFoundError('User not found');
  }
};

export const getUserByGitHandle = async (gitHandle: string) => {
  const user = await UserModel.findOne({ gitHandle });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const profile: Profile = {
    name: user.name,
  };

  return profile;
}
