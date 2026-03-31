import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/auth/signin',
  },
});

// Exclude home ('/') and auth ('/auth/*')
export const EXCLUDE_AUTH_REGEX = /^(?!\/auth).+/;
// Exclude peer review reviewer console ('/courses/:id/peer-review/:assignmentId')
export const EXCLUDE_PEER_REVIEW_REVIEWER_CONSOLE_REGEX =
  /^(?!\/courses\/[^/]+\/peer-review\/[^/]).+/;
// Exclude peer review grading console ('/courses/:id/internal-assessments/:assessmentId/peer-review/:submissionId')
export const EXCLUDE_PEER_REVIEW_GRADING_CONSOLE_REGEX =
  /^(?!\/courses\/[^/]+\/internal-assessments\/[^/]+\/peer-review\/[^/]).+/;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|auth|user-guide|dev-guide|.*\\..*|$).*)',
  ],
};
