import { Request, Response } from 'express';
import { NotFoundError } from '../services/errors';
import {
  checkGitHubInstallation,
  fetchAllTeamData,
  fetchAllTeamDataForOrg,
} from '../services/githubService';
import CourseModel from '../models/Course';
import { fetchAndSaveJiraData } from '../jobs/jiraJob';

// Define OAuth 2.0 configuration
const authorizationUrl = 'https://auth.atlassian.com/authorize';
const tokenUrl = 'https://auth.atlassian.com/oauth/token';
const cloudUrl = 'https://api.atlassian.com/oauth/token/accessible-resources';


// Handle authorization flow
export const authorizeJiraAccount = (req: Request, res: Response) => {
  // Redirect users to the authorization URL

  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const redirectUri = `${process.env.BACKEND_URI}:${process.env.PORT}/callback`;
  const courseId = req.query.course as string;

  const authParams = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: clientId as string,
    scope: 'offline_access read:issue-details:jira read:project:jira read:board-scope:jira-software read:sprint:jira-software',
    redirect_uri: redirectUri,
    state: courseId,
    response_type: 'code',
    prompt: 'consent',
  });
  const authRedirectUrl = `${authorizationUrl}?${authParams}`;
  res.redirect(authRedirectUrl);
};

// Handle redirect from Jira after authorization
export const callbackJiraAccount =  async (req: Request, res: Response) => {
  const { state, code } = req.query;

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = `${process.env.BACKEND_URI}:${process.env.PORT}/callback`;

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
    });

    const data = await response.json();
    console.log(data);
    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;

    // Store access token securely and use it for API requests
    // Implement your token storage logic here
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
    res.redirect(`http://localhost:3000/courses/${state}`);
    await fetchAndSaveJiraData();

  } catch (error) {
    console.error(
      'Error exchanging authorization code for access token:',
      error
    );
    res
      .status(500)
      .send('Error exchanging authorization code for access token');
  }
};