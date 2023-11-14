import { User } from './User';
import type { Role } from './auth/Role';

export interface Account {
  email: string;
  password: string;
  role: Role;
  isApproved: boolean;
  user: User;
}
