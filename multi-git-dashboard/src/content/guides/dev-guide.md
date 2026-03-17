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

- Clone the repository from GitHub to your local machine.
```
git clone https://github.com/NUS-CRISP/CRISP.git
```
- **Environment Setup:** Copy each package's `.env.example` to `.env.development`. The example files already contain the full key list; use the notes below to understand what each key is for. Feel free to contact current developers for clarifications/specific credentials.
- **Frontend environment (`multi-git-dashboard/.env.example`):**
  - `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`: GitHub App credentials used by the app's GitHub integration flows. See [GitHub App documentation](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation) for more details.
  - `MONGODB_URI`: MongoDB connection string for the frontend's server-side data access.
  - `DB_NAME`: `crisp`
  - `NEXTAUTH_SECRET`, `NEXTAUTH_URL`: NextAuth session secret and frontend base URL (`http://localhost:3002`) for auth callbacks.
  - `NODE_ENV`: Runtime environment, set as `development` for local development.
  - `NEXT_PUBLIC_DOMAIN`: `localhost`
  - `NEXT_PUBLIC_BACKEND_PORT`: `3002`
  - `BACKEND_PORT`: `3003`
  - `TELEGRAM_BOT_NAME`, `TELEGRAM_BOT_HANDLE`: If you need to test the Telegram bot during development, you can set these to your own Telegram bot name and handle after creating one using @BotFather.

- **Backend environment (`backend/.env.example`):**
  - `GITHUB_APP_ID`: GitHub App credentials used by the app's GitHub integration flows. See [GitHub App documentation](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation) for more details.
  - `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_INSTALLATION_ID`: GitHub App credentials and installation ID used for backend GitHub API access. Contact current developers for credentials.
  - `MONGODB_URI`: `mongodb://localhost:27017/crisp`
  - `PORT`: `3003`
  - `RUN_JOB_NOW`: Set to `true` to run scheduled jobs immediately on startup.
  - `NEXTAUTH_SECRET`: Generated key from local terminal: `openssl rand -base64 32`
  - `NEXTAUTH_TOKEN_HEADER`: `next-auth.session-token`
  - `GOOGLE_CLIENT_EMAIL`: `crisp-web@rising-solstice-414305.iam.gserviceaccount.com`
  - `GOOGLE_PRIVATE_KEY`: Contact current developers for credentials.
  - `FRONTEND_URI`: `http://localhost:3002`
  - `CLIENT_ID`, `CLIENT_SECRET`: OAuth credentials for Jira integration. Contact current developers for credentials.
  - `SONAR_URI`: `http://localhost:9000
  - `SONAR_TOKEN`: SonarQube server URL and access token used by code analysis jobs. Contact current developers for credentials.
  - `SONAR_PATH`, `REPO_PATH`: Sonar scanner path and local repository base path used during analysis runs.
  - `AI_TOKEN`: API token used by the AI insights job. Contact current developers for credentials.
  - `TEST_EMAIL_ON_NOTIFICATION_JOB_START`:, `RUN_NOTIFICATION_JOB`: Flags for testing email and notification job. Default to `false`.
  - `SMTP_SERVICE`, `SMTP_USER`, `SMTP_PASS`: SMTP credentials for outgoing email. Contact current developers for credentials if necessary.
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
