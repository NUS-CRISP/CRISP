import UserModel from '@models/User';
import { BadRequestError, NotFoundError } from './errors';
import AccountModel from '@models/Account';

export const editUser = async (
  accountId: string,
  userId: string,
  updateData: any
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
