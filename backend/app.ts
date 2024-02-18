import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import express, { Express } from 'express';
import setupGitHubJob from './jobs/githubJob';
import setupJiraJob from './jobs/jiraJob';
import accountRoutes from './routes/accountRoutes';
import assessmentRoutes from './routes/assessmentRoutes';
import courseRoutes from './routes/courseRoutes';
import githubRoutes from './routes/githubRoutes';
import teamDataRoutes from './routes/teamDataRoutes';
import teamRoutes from './routes/teamRoutes';
import teamSetRoutes from './routes/teamSetRoutes';
import { connectToDatabase } from './utils/database';
import CourseModel from './models/Course';

dotenv.config();

const setupApp = async () => {
  await connectToDatabase();
  // setupGitHubJob();
  setupJiraJob();
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

// Define OAuth 2.0 configuration
const clientId = 'PYNndw5d9EUdU7zvkTb5nR74aZFWJqbw';
const clientSecret =
  'ATOA57k51aSrtFcBDw0Qf13nWpgBg8Z69A14PE0xlqbcd2_cHrV54sGWujy2F9Ka9x15764FDA10';
// const redirectUri = 'https://strand.comp.nus.edu.sg';
const redirectUri = 'http://localhost:3001/callback';
const YOUR_USER_BOUND_VALUE = 'sample-value';
const authorizationUrl = 'https://auth.atlassian.com/authorize';
const tokenUrl = 'https://auth.atlassian.com/oauth/token';
const cloudUrl = 'https://api.atlassian.com/oauth/token/accessible-resources';

// Handle authorization flow
app.get('/authorize', (req, res) => {
  // Redirect users to the authorization URL
  const courseId = req.query.course as string;

  const authParams = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: clientId,
    scope: 'offline_access read:jira-user read:board-scope:jira-software read:project:jira',
    redirect_uri: redirectUri,
    state: courseId,
    response_type: 'code',
    prompt: 'consent',
  });
  const authRedirectUrl = `${authorizationUrl}?${authParams}`;
  res.redirect(authRedirectUrl);
});

// Handle redirect from Jira after authorization
app.get('/callback', async (req, res) => {
  const { state, code } = req.query;

  // Exchange authorization code for access token

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code as string,
      }),
      // body: JSON.stringify(tokenParams),
    });

    const data = await response.json();
    console.log(data);
    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;

    // Store access token securely and use it for API requests
    // Implement your token storage logic here
    fs.appendFileSync('.env', `\nACCESS_TOKEN=${accessToken}`);

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    };

    // Make the API request to fetch accessible resources, including the cloudId
    await fetch(cloudUrl, { headers })
      .then(response => response.json())
      .then(async data => {
        // Extract the cloudId from the response
        const cloudId = data[0].id; // Assuming the cloudId is in the first element of the response
        console.log('Cloud ID:', cloudId);
        await CourseModel.findOneAndUpdate(
          { _id: state },
          { cloudId: cloudId, accessToken: accessToken, refreshToken: refreshToken },
          {}
        );
      })
      .catch(error => {
        console.error('Error:', error);
      });

    // res.send('Authorization successful!');
    res.redirect('http://localhost:3000');
  } catch (error) {
    console.error(
      'Error exchanging authorization code for access token:',
      error
    );
    res
      .status(500)
      .send('Error exchanging authorization code for access token');
  }
});

// Make authorized requests to Jira API using the access token
// Implement your API request logic here

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
