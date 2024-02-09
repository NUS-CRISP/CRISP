import Roles, { Role } from '@shared/types/auth/Role';
import { useSession } from 'next-auth/react';

export const hasPermission = (...roles: Role[]) => {
  const { data: session } = useSession();
  return session?.user.role && roles.includes(session.user.role);
};

export const hasFacultyPermission = () =>
  hasPermission(Roles.Admin, Roles.Faculty);
