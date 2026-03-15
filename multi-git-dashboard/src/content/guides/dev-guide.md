## Project Structure

CRISP is a monorepo with the following main components:

- `multi-git-dashboard` - Next.js frontend application
- `backend` - Express.js API server with MongoDB
- `shared` - Shared TypeScript types and utilities

## Getting Started (Development)

- **Prerequisites:** Node.js (v12+), pnpm, MongoDB
- **Environment:** Copy `.env.example` to `.env` and configure your variables (database URL, GitHub tokens, etc.)
- **Install:** Run `pnpm install` in the project root
- **Frontend:** Run `pnpm dev` in `multi-git-dashboard` (default port: 3002)
- **Backend:** Start the Express server in the `backend` directory

## Architecture

### Authentication

NextAuth with Credentials provider. Session-based auth protects most routes. Public routes: home, auth, and guide pages.

### API

REST API built with Express. Routes are organized by domain (accounts, courses, assessments, etc.). MongoDB + Mongoose for data persistence.

### GitHub Integration

Octokit for GitHub API. Used for repository access, PR data, and code analysis. Requires GitHub tokens in environment config.

## Learn More

For end-user documentation, see the [User Guide](/user-guide). Check the README in each package for more detailed setup instructions.
