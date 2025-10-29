import CrispRole, { CrispRoleType } from '@shared/types/auth/CrispRole';
import { useSession } from 'next-auth/react';

export const hasPermission = (...CrispRoles: CrispRoleType[]) => {
  const { data: session } = useSession();
  return (
    (session?.user.crispRole && CrispRoles.includes(session.user.crispRole)) ||
    false
  );
};

export const hasFacultyPermission = () =>
  hasPermission(CrispRole.Admin, CrispRole.Faculty);

export const isTrialUser = (...CrispRoles: CrispRoleType[]) => {
  const { data: session } = useSession();
  return (
    (session?.user.crispRole && CrispRoles.includes(session.user.crispRole)) ||
    false
  );
};

export const isTrial = () => isTrialUser(CrispRole.TrialUser);

export const logLogin = async () => {
  const res = await fetch('/api/metrics/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    console.error('Failed to log login event:', res.statusText);
  }
};
