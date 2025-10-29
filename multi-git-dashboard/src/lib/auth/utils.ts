import { CRISP_ROLE, CrispRole } from '@shared/types/auth/CrispRole';
import { useSession } from 'next-auth/react';

export const hasPermission = (...CrispRoles: CrispRole[]) => {
  const { data: session } = useSession();
  return (
    (session?.user.crispRole && CrispRoles.includes(session.user.crispRole)) ||
    false
  );
};

export const hasFacultyPermission = () =>
  hasPermission(CRISP_ROLE.Admin, CRISP_ROLE.Faculty);

export const isTrialUser = (...CrispRoles: CrispRole[]) => {
  const { data: session } = useSession();
  return (
    (session?.user.crispRole && CrispRoles.includes(session.user.crispRole)) ||
    false
  );
};

export const isTrial = () => isTrialUser(CRISP_ROLE.TrialUser);

export const logLogin = async () => {
  const res = await fetch('/api/metrics/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    console.error('Failed to log login event:', res.statusText);
  }
};
