const CourseRole = {
  Faculty: 'Faculty member',
  TA: 'Teaching assistant',
  Student: 'Student',
} as const;

export type CourseRole = (typeof CourseRole)[keyof typeof CourseRole];
export type CourseRoleTuple = {
  course: string;
  courseRole: CourseRole;
};

export default CourseRole;
