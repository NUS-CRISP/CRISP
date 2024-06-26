import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/auth/signin',
  },
});

// Exclude home ('/') and auth ('/auth/*')
export const EXCLUDE_AUTH_REGEX = /^(?!\/auth).+/;

export const config = {
  matcher: ['/((?!_next/static|_next/image|auth|favicon.png|$).*)'],
};
