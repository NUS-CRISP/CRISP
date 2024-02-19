import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import express, { Express } from 'express';
import setupGitHubJob from './jobs/githubJob';
import setupJiraJob, { fetchAndSaveJiraData } from './jobs/jiraJob';
import accountRoutes from './routes/accountRoutes';
import assessmentRoutes from './routes/assessmentRoutes';
import courseRoutes from './routes/courseRoutes';
import githubRoutes from './routes/githubRoutes';
import jiraRoutes from './routes/jiraRoutes';
import teamDataRoutes from './routes/teamDataRoutes';
import teamRoutes from './routes/teamRoutes';
import teamSetRoutes from './routes/teamSetRoutes';
import { connectToDatabase } from './utils/database';
import CourseModel from './models/Course';
import { authorizeJiraAccount, callbackJiraAccount } from './controllers/jiraController';

dotenv.config();

const setupApp = async () => {
  await connectToDatabase();
  // setupGitHubJob();
  // setupJiraJob();
};

setupApp();

const port = process.env.PORT;
const app: Express = express();

app.use(express.json());

app.use(cors());

app.use('/api/courses', courseRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/teamdatas', teamDataRoutes);
app.use('/api/teamsets', teamSetRoutes);
app.use('/api/assessments', assessmentRoutes);
// app.use('/api/jira', jiraRoutes);

// Define OAuth 2.0 configuration
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = `${process.env.BACKEND_URI}:${process.env.PORT}/callback`;
const authorizationUrl = 'https://auth.atlassian.com/authorize';
const tokenUrl = 'https://auth.atlassian.com/oauth/token';
const cloudUrl = 'https://api.atlassian.com/oauth/token/accessible-resources';


// app.get('/authorize', (req, res) => {
//   // Redirect users to the authorization URL
//   const courseId = req.query.course as string;

//   const authParams = new URLSearchParams({
//     audience: 'api.atlassian.com',
//     client_id: clientId as string,
//     scope: 'offline_access read:issue-details:jira read:project:jira read:board-scope:jira-software read:sprint:jira-software',
//     redirect_uri: redirectUri,
//     state: courseId,
//     response_type: 'code',
//     prompt: 'consent',
//   });
//   const authRedirectUrl = `${authorizationUrl}?${authParams}`;
//   res.redirect(authRedirectUrl);
// });
app.get('/authorize', authorizeJiraAccount)
app.get('/callback', callbackJiraAccount)

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
