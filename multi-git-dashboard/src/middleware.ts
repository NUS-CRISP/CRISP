import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/auth/signin',
  },
});

// Exclude home ('/') and auth ('/auth/*')
export const EXCLUDE_AUTH_REGEX = /^(?!\/auth).+/;

export const config = {
  // Matcher must be static; see https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: ['/((?!auth).*)(.+)'],
};
