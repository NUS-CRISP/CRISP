import { Role } from '@shared/types/auth/Role';

declare module 'next-auth' {
  interface User {
    id: string;
    name: string;
    role: Role;
  }

  interface Session {
    user: User;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    name: string;
    role: Role;
  }
}
