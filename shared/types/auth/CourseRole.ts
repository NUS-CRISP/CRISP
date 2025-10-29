export const COURSE_ROLE = {
  Faculty: 'Faculty member',
  TA: 'Teaching assistant',
  Student: 'Student',
} as const;

export type CourseRole = (typeof COURSE_ROLE)[keyof typeof COURSE_ROLE];
export type CourseRoleTuple = {
  course: string;
  courseRole: CourseRole;
};
