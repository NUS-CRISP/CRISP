import type { Course } from './Course';
import type { Account } from './Account';

export interface User {
  _id: string;
  identifier: string;
  name: string;
  enrolledCourses: Course[];
  gitHandle: string;
}

interface TableUser extends Omit<User, '_id' | 'enrolledCourses'> {
  enrolledCourses: string[];
}

export const getTableUser = (user: User): TableUser => {
  const { identifier, name, enrolledCourses, gitHandle } = user;
  return {
    identifier,
    name,
    enrolledCourses: enrolledCourses.map((c) => c.name),
    gitHandle,
  };
};
