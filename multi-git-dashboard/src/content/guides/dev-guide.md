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

## Running the System
You may choose to run the system manually or using Docker.

### Manual Setup
- Install dependencies by running `npm install` in both the frontend and backend directories. 
- Start the development servers by running `npm run dev` in both directories **simultaneously**.

### Docker Setup
- Run `docker compose up --build -d` to start
- Run `docker compose down` to stop.
- To access the system, open your browser and navigate to `http://localhost`.

## VM Deployment

### SoC Staging VM
To deploy in SoC Staging VM (using Docker):
1. `sudo -s`
2. `docker compose down`
3. `git fetch`
4. `git pull`
5. `docker compose up --build -d`

### SoC **Production** VM
To deploy in SoC Production VM (using Docker):
1. `sudo -s`
2. `sudo reboot`
3. `docker compose down`
4. `sudo lsof -i :27017`
5. `sudo lsof -i :80`
6. `sudo kill -9 <pid>` Kill any running instances of MongoDB and NGINX.
7. `cd CRISP`
8. `git fetch`
9. `git pull`
10. `docker compose up --build -d`

## Debugging

- **Viewing Docker Logs:**
1. `docker ps` to view all running containers.
2. `docker logs <id>` to view the logs of a specific container.
where `<id>` is the respective container ID: `multi-git-dashboard`, `backend`, `mongo`, `nginx`.
- **Insufficient Disk Space:** If the landing page is broken or logs show "No space left on device", run `docker system prune -a --volumes` and delete old course repos from `/sadm/home/Repositories/`.
- **Sonarqube Not Running:** Start it manually with `docker start sonarqube`.
- **Port Conflicts:** If ports 8080 or 27017 are taken (usually after a reboot), kill the process, then run `docker compose down` and `docker compose up` again.
- **Unrecognized Errors:** Run `docker compose down` and reboot the VM.

## Contribution Guidelines

### Commits
Write clear and detailed commit messages. A commit message consists of a header, a body, and a footer. The header has a special format that includes a type, a scope, and a subject:
```
<type>(<optional scope>): <description>
<optional body>
<optional footer>
```
**Types:**
  - `feat`: Commits that add or remove a new feature
  - `fix`: Commits that fix a bug
- `refactor`: Commits that rewrite/restructure your code, however does not change any API behaviour
- `perf`: Commits that improve performance
- `style`: Commits that do not affect the meaning (white-space, formatting, missing semi-colons, etc)
- `test`: Commits that add missing tests or correcting existing tests
- `docs`: Commits that affect documentation only
- `build`: Commits that affect build components like build tool, ci pipeline, dependencies, project version, ...
- `ops`: Commits that affect operational components like infrastructure, deployment, backup, recovery, ...
- `chore`: Miscellaneous commits e.g. modifying .gitignore

### Pull Requests
Once you're ready to share your contributions, follow these steps to submit a Pull Request using the forking workflow:

1. Create a New Branch: Create a new branch for your changes based on the main branch on your GitHub fork.   
  `git checkout -b feature/my-new-feature main`

2. Make Your Changes: Implement your feature or fix and commit your changes using the provided format.
3. Keep Your Branch Updated: Regularly pull the latest changes from the upstream repository and merge them into your branch to keep it up to date.
  `git fetch upstream`
  `git rebase upstream/main`

4. Run the code formatter: Run the Prettier script in both the frontend and the backend
  `cd multi-git-dashboard`
  `npm run prettier-format`
  `cd ../backend`
  `npm run prettier-format`
5. Push Your Changes: Push your branch and changes to your GitHub fork.
  `git push origin feature/my-new-feature`
6. Open a Pull Request (PR): Go to your fork on GitHub and create a new Pull Request against the staging branch of the upstream repository. Make sure to fill out the Pull Request Template with the necessary details.

## Database Access

To connect to the VM DB using MongoDB Compass:

1. Connect to the SoC VPN (not the standard NUS VPN).
2. Create a new connection with username and password both set to `admin`.
3. Set up an SSH Tunnel using the correct SSH hostname and password for the environment.

## Learn More

For end-user documentation, see the [User Guide](/user-guide). Check the README in each package for more detailed setup instructions. Feel free to contact the CRISP team at <crisp@nus.edu.sg> for any clarifications or feedback.
