import { Request, Response } from 'express';
import { URLSearchParams } from 'url';
import { fetchAndSaveJiraData } from '../jobs/jiraJob';
import { MissingAuthorizationError, NotFoundError } from '../services/errors';
import { getJiraBoardNamesByCourse } from '../services/projectManagementService';
import { getAccountId } from '../utils/auth';
import { AUTHORIZATION_URL, REDIRECT_URI_PATH } from '../utils/endpoints';
import {
  exchangeCodeForToken,
  fetchCloudIdsAndUpdateCourse,
} from '../utils/jira';

// Handle authorization flow
export const authorizeJiraAccount = async (req: Request, res: Response) => {
  const clientId = process.env.CLIENT_ID;
  const redirectUri = `${process.env.FRONTEND_URI}${REDIRECT_URI_PATH}`;
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

  const authRedirectUrl = `${AUTHORIZATION_URL}?${authParams}`;
  res.redirect(authRedirectUrl);
};

// Handle redirect from Jira after authorization
export const callbackJiraAccount = async (req: Request, res: Response) => {
  const { state, code } = req.query;
  const frontendUri = `${process.env.FRONTEND_URI}/courses/${state}/project-management`;

  try {
    const { accessToken, refreshToken } = await exchangeCodeForToken(
      code as string
    );

    await fetchCloudIdsAndUpdateCourse(
      accessToken,
      refreshToken,
      state as string
    );

    res.redirect(frontendUri);
    await fetchAndSaveJiraData();
  } catch (error) {
    console.error('Error processing callback:', error);
    res.status(500).send('Error processing callback');
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
