import CrispRoles, { CrispRole } from '@shared/types/auth/CrispRole';
import CourseRoles, { CourseRole, CourseRoleTuple } from '@shared/types/auth/CourseRole';
import { useSession } from 'next-auth/react';

export const hasPermission = (...CrispRoles: CrispRole[]) => {
  const { data: session } = useSession();
  return (session?.user.crispRole && CrispRoles.includes(session.user.crispRole)) || false;
};

export const hasFacultyPermission = () =>
  hasPermission(CrispRoles.Admin, CrispRoles.Faculty);

export const hasCoursePermission = (courseId: string, ...CourseRoles: CourseRole[]) => {
  const { data: session } = useSession();
  return (session?.user.courseRoles && CourseRoles.includes(session.user.courseRoles.filter((r: CourseRoleTuple) => r[0] === courseId)[1])) || false;
};

export const hasCourseFacultyPermission = (courseId: string) =>
  hasCoursePermission(courseId, CourseRoles.Faculty);

export const logLogin = async () => {
  const res = await fetch('/api/metrics/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    console.error('Failed to log login event:', res.statusText);
  }
};
