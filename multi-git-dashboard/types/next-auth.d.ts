import { Role } from '@shared/types/auth/Role';
import { SessionUser } from '@shared/types/auth/SessionUser';

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: SessionUser;
  }

  interface User extends SessionUser {}
}

declare module 'next-auth/jwt' {
  interface JWT {
    name: string;
    role: Role;
  }
}
