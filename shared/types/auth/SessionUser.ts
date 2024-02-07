import { Role } from './Role';

export interface SessionUser {
  id: string;
  name: string;
  role: Role;
}
