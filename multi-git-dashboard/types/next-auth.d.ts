import { DefaultSession } from 'next-auth';
import { Role } from 'types';

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's role. One of:
       * - admin
       * - Faculty member
       * - Teaching assistant
       */
      role: Role;
      /** The user's unique identifier. */
      id: string;
    } & DefaultSession['user'];
  }

  interface User {
    /** The user's role. One of:
     * - admin
     * - Faculty member
     * - Teaching assistant
     */
    role: Role;
    /** The user's unique identifier. */
    id: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    /** The user's role. One of:
     * - admin
     * - Faculty member
     * - Teaching assistant
     */
    role: Role;
    /** The user's unique identifier. */
    id: string;
  }
}
