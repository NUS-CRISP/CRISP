import { User } from './User';
import type { Role } from './auth/Role';

export interface Account {
  _id: string;
  email: string;
  telegram: string;
  password: string;
  role: Role;
  isApproved: boolean;
  wantsEmailNotifications: boolean;
  wantsTelegramNotifications: boolean;
  user: User;
}
