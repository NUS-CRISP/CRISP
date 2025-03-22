import { CourseRoleTuple } from '@shared/types/auth/CourseRole';
import { CrispRole } from '@shared/types/auth/CrispRole';

declare module 'next-auth' {
  interface User {
    id: string;
    name: string;
    crispRole: CrispRole;
    courseRoles: CourseRoleTuple[]
  }

  interface Session {
    user: CrispUser;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    name: string;
    crispRole: CrispRole;
    courseRoles: CourseRoleTuple[]
  }
}
