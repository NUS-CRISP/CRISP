import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/auth/signin',
  },
});

export const config = {
  matcher: [
    // Match all paths except /auth/signin and /auth/register
    '/((?!auth/signin|auth/register).*)',
  ],
};
