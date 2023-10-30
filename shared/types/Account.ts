import { User } from './User';
import { Role } from './auth/Role';

export interface Account {
  email: string;
  password: string;
  role: Role;
  isApproved: boolean;
  user: User;
}
