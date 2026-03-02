import { CRISP_ROLE, CrispRole } from '@shared/types/auth/CrispRole';
import { COURSE_ROLE, CourseRole, CourseRoleTuple } from '@shared/types/auth/CourseRole';
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

export const hasTAPermission = (courseId: string) => {
  const { data: session } = useSession();
  const userCourseRole = session?.user.courseRoles.find(
    cr => cr.course.toString() === courseId
  )?.courseRole;
  return (userCourseRole && userCourseRole === COURSE_ROLE.TA) || false;
}

export const hasCoursePermission = (
  courseId: string,
  authorisedRoles: CourseRole[]
) => {
  const { data: session } = useSession();
  const userCourseRole = session?.user.courseRoles.find(
    cr => cr.course.toString() === courseId
  )?.courseRole;
  return (userCourseRole && authorisedRoles.includes(userCourseRole));
};

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

export const getMe = async (courseId: string) => {
  const res = await fetch(`/api/courses/${courseId}/me`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    console.error('Failed to fetch user data:', res.statusText);
    return null;
  }

  return res.json();
};
