import AccountModel from '@models/Account';
import UserModel from '@models/User';
import { Profile } from '@shared/types/Profile';
import { BadRequestError, NotFoundError } from './errors';
import CrispRole from '@shared/types/auth/CrispRole';

// TODO
// Nephelite's note:
// This code is a warcrime committed by auhc99.
// Faculty of any course can edit any user in the database, not just their own.
// I recommend that at some point, we segregate User and CourseUser.
// I'm not fixing it right now because I'm busy restructuring the role system.
export const editUser = async (
  accountId: string,
  userId: string,
  updateData: Record<string, unknown>
) => {
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }
  if (account.crispRole !== CrispRole.Admin && account.crispRole !== CrispRole.Faculty) {
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
};
