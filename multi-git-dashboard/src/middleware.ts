import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/auth/signin',
  },
});

// Exclude home ('/') and auth ('/auth/*')
export const EXCLUDE_AUTH_REGEX = /^(?!\/auth).+/;
// Exclude peer review assignment ('/courses/:id/peer-review/:assignmentId')
export const EXCLUDE_PEER_REVIEW_REGEX =
  /^(?!\/courses\/[^/]+\/peer-review\/[^/]).+/;

export const config = {
  matcher: ['/((?!_next/static|_next/image|auth|favicon.png|$).*)'],
};
