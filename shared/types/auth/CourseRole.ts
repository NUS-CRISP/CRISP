const CourseRole = {
  Faculty: 'Faculty member',
  TA: 'Teaching assistant',
  Student: 'Student',
} as const;

export type CourseRole = (typeof CourseRole)[keyof typeof CourseRole];
export type CourseRoleTuple = [string, CourseRole];

export default CourseRole;
