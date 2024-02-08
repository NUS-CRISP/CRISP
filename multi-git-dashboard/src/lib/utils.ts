import { Role } from '@shared/types/auth/Role';
import { Session } from 'next-auth';

/**
 * Adds a delay to function execution (remember to await)
 * @param ms Number of milliseconds to delay
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Converts epoch time to a date string
 * @param epoch Epoch time
 * @returns Date string
 */
const epochToDateString = (epoch: number) =>
  new Date(epoch * 1000).toLocaleDateString();

const hasPermission = (session: Session | null, ...roles: Role[]) =>
  session?.user.role && roles.includes(session.user.role);

const hasFacultyPermission = (session: Session | null) =>
  hasPermission(session, 'admin', 'Faculty member');

export { delay, epochToDateString, hasPermission, hasFacultyPermission };
