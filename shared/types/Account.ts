import { User } from './User';

export interface Account {
  email: string;
  password: string;
  role: string;
  isApproved: boolean;
  user: User;
}
