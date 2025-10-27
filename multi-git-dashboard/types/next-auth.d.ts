import { CourseRoleTuple } from '@shared/types/auth/CourseRole';
import { CrispRole } from '@shared/types/auth/CrispRole';

declare module 'next-auth' {
  interface User {
    id: string;
    name: string;
    email: string;
    crispRole: CrispRole;
    courseRoles: CourseRoleTuple[];
  }

  interface Session {
    user: User;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    name: string;
    email: string;
    crispRole: CrispRole;
    courseRoles: CourseRoleTuple[];
  }
}
