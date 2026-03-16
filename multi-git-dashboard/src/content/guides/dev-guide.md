## Project Structure

CRISP utilises a MERN (MongoDB, Express.js, React, Node.js) stack and follows a monorepo structure with the following main folders:

- `multi-git-dashboard` - Next.js frontend application
- `backend` - Express.js API server with MongoDB
- `shared` - Shared TypeScript types and utilities

## Getting Started (Development)

Before you begin, make sure you have the following installed:

- Git: For version control
- Node.js: JavaScript runtime (use Node 18 LTS or later)
- npm or yarn: Package manager to install dependencies
- MongoDB: Our chosen database
- Docker: Container to build and deploy app quickly

## Architecture

### Authentication

NextAuth with Credentials provider. Session-based auth protects most routes. Public routes: home, auth, and guide pages.

### API

REST API built with Express. Routes are organized by domain (accounts, courses, assessments, etc.). MongoDB + Mongoose for data persistence.

### GitHub Integration

Octokit for GitHub API. Used for repository access, PR data, and code analysis. Requires GitHub tokens in environment config.

## Development

- **Environment:** Copy each package's `.env.example` to `.env.development`. The example files already contain the full key list; use the notes below to understand what each key is for. Feel free to contact current developers for clarifications/specific credentials.
- **Frontend environment (`multi-git-dashboard/.env.example`):**
  - `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`: GitHub App credentials used by the app's GitHub integration flows.
  - `MONGODB_URI`: MongoDB connection string for the frontend's server-side data access.
  - `DB_NAME`: MongoDB database name used by NextAuth and other frontend server-side queries.
  - `NEXTAUTH_SECRET`, `NEXTAUTH_URL`: NextAuth session secret and frontend base URL for auth callbacks.
  - `NODE_ENV`: Runtime environment, usually `development` for local setup.
  - `NEXT_PUBLIC_TRIAL_USER_ID`: User ID for the trial or demo login path.
  - `NEXT_PUBLIC_TELEGRAM_BOT_NAME`, `NEXT_PUBLIC_TELEGRAM_BOT_HANDLE`: If you need to test the Telegram bot during development, you can set these to your own Telegram bot name and handle after creating one using @BotFather.
- **Backend environment (`backend/.env.example`):**
  - `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_INSTALLATION_ID`: GitHub App credentials and installation ID used for backend GitHub API access.
  - `MONGODB_URI`: MongoDB connection string for the backend API and jobs.
  - `PORT`: Port the Express server listens on locally.
  - `RUN_JOB_NOW`: Set to `true` to run scheduled jobs immediately on startup.
  - `NEXTAUTH_SECRET`, `NEXTAUTH_TOKEN_HEADER`: Auth settings the backend uses to validate frontend-issued sessions and locate the expected auth cookie or header.
  - `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`: Google service account credentials used for Google API integrations.
  - `FRONTEND_URI`: Frontend base URL used when building backend redirect URLs.
  - `CLIENT_ID`, `CLIENT_SECRET`: OAuth credentials for Jira integration.
  - `SONAR_URI`, `SONAR_TOKEN`: SonarQube server URL and access token used by code analysis jobs.
  - `SONAR_PATH`, `REPO_PATH`: Sonar scanner path and local repository base path used during analysis runs.
  - `AI_TOKEN`: API token used by the AI insights job.
  - `TEST_EMAIL_ON_NOTIFICATION_JOB_START`, `RUN_NOTIFICATION_JOB`: Flags for testing or enabling the notification job.
  - `SMTP_SERVICE`, `SMTP_USER`, `SMTP_PASS`: SMTP credentials for outgoing email. Contact current developers for credentials.
  - `TEST_TO_EMAIL`: Recipient for notification test emails.
  - `TELEGRAM_BOT_TOKEN`: If you need to test the Telegram bot during development, you can set this to your own Telegram bot token after creating one using @BotFather.

- **Install:** Navigate to both `multi-git-dashboard` and `backend` directories and run `npm install`.
- **Run:** Start the development servers by running `npm run dev` in both directories.

- **Commit Guideline:** Use the format `<type>(<optional scope>): <description>`. Valid types include `feat`, `fix`, `refactor`, `perf`, `style`, `test`, `docs`, `build`, `ops`, and `chore`.
- **Pull Requests:** Before pushing, format your code by running `npm run prettier-format` in both the frontend and backend directories. Submit PRs against the `staging` branch.

## VM Deployment

To deploy:

1. `docker compose down`
2. `docker compose up --build -d`

After deploying, verify the database connection by checking the logs (`docker logs crisp-backend-1`). You should see a successful connection message.

## Debugging

- **Insufficient Disk Space:** If the landing page is broken or logs show "No space left on device", run `docker system prune -a --volumes` and delete old course repos from `/sadm/home/Repositories/`.
- **Sonarqube Not Running:** Start it manually with `docker start sonarqube`.
- **Port Conflicts:** If ports 8080 or 27017 are taken (usually after a reboot), kill the process, then run `docker compose down` and `docker compose up` again.
- **Unrecognized Errors:** Run `docker compose down` and reboot the VM.

## Database Access

To connect to the VM DB using MongoDB Compass:

1. Connect to the SoC VPN (not the standard NUS VPN).
2. Create a new connection with username and password both set to `admin`.
3. Set up an SSH Tunnel using the correct SSH hostname and password for the environment.

## Learn More

For end-user documentation, see the [User Guide](/user-guide). Check the README in each package for more detailed setup instructions. Feel free to contact the CRISP team at <crisp@nus.edu.sg> for any clarifications or feedback.
