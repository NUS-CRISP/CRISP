import { Request, Response } from 'express';
import { URLSearchParams } from 'url';
import { fetchAndSaveJiraData } from '../jobs/jiraJob';
import CourseModel from '../models/Course';
import { getAccountId } from '../utils/auth';
import { getJiraBoardNamesByCourse } from '../services/projectManagementService';
import { MissingAuthorizationError, NotFoundError } from '../services/errors';

// Define OAuth 2.0 configuration
const authorizationUrl = 'https://auth.atlassian.com/authorize';
const tokenUrl = 'https://auth.atlassian.com/oauth/token';
const cloudUrl = 'https://api.atlassian.com/oauth/token/accessible-resources';

// Handle authorization flow
export const authorizeJiraAccount = async (req: Request, res: Response) => {
  const clientId = process.env.CLIENT_ID;
  const redirectUri = `${process.env.FRONTEND_URI}/api/jira/callback`;
  const courseId = req.query.course as string;

  const authParams = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: clientId as string,
    scope:
      'offline_access read:issue-details:jira read:project:jira read:board-scope:jira-software read:sprint:jira-software read:issue:jira-software read:board-scope.admin:jira-software',
    redirect_uri: redirectUri,
    state: courseId,
    response_type: 'code',
    prompt: 'consent',
  });
  const authRedirectUrl = `${authorizationUrl}?${authParams}`;
  res.redirect(authRedirectUrl);
};

// Handle redirect from Jira after authorization
export const callbackJiraAccount = async (req: Request, res: Response) => {
  const { state, code } = req.query;
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const redirectUri = `${process.env.FRONTEND_URI}/api/jira/callback`;
  const frontendUri = `${process.env.FRONTEND_URI}/courses/${state}/project-management`;

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
    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    };

    // Make the API request to fetch accessible resources, including the cloudId
    await fetch(cloudUrl, { headers })
      .then(response => response.json())
      .then(async data => {
        // Extract the cloudId from the response
        const cloudIds = data.map((item: { id: string }) => item.id);
        await CourseModel.findOneAndUpdate(
          { _id: state },
          {
            jira: {
              isRegistered: true,
              cloudIds: cloudIds,
              accessToken: accessToken,
              refreshToken: refreshToken,
            },
          },
          {}
        );
      })
      .catch(error => {
        console.error('Error:', error);
      });

    res.redirect(frontendUri);
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

export const getAllJiraBoardNamesByCourse = async (
  req: Request,
  res: Response
) => {
  const courseId = req.params.id;

  try {
    const accountId = await getAccountId(req);
    const jiraBoards = await getJiraBoardNamesByCourse(accountId, courseId);
    res.status(200).json(jiraBoards);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof MissingAuthorizationError) {
      res.status(400).json({ error: 'Missing authorization' });
    } else {
      console.error('Error fetching teams:', error);
      res.status(500).json({ error: 'Failed to fetch teams' });
    }
  }
};
