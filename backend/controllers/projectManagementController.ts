import { Request, Response } from 'express';
import { URLSearchParams } from 'url';
import { fetchAndSaveJiraData } from '../jobs/jiraJob';
import { getAccountId } from '../utils/auth';
import { exchangeCodeForToken, fetchCloudIdsAndUpdateCourse } from '../utils/jira';
import { getJiraBoardNamesByCourse } from '../services/projectManagementService';
import { NotFoundError } from '../services/errors';

// Handle authorization flow
export const authorizeJiraAccount = async (req: Request, res: Response) => {
  const authorizationUrl = 'https://auth.atlassian.com/authorize';
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
  const frontendUri = `${process.env.FRONTEND_URI}/courses/${state}/project-management`;

  try {
    const { accessToken, refreshToken } = await exchangeCodeForToken(code as string);
    await fetchCloudIdsAndUpdateCourse(accessToken, refreshToken, state as string);

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

  const accountId = await getAccountId(req);
  if (!accountId) {
    res.status(400).json({ error: 'Missing authorization' });
    return;
  }

  try {
    const jiraBoards = await getJiraBoardNamesByCourse(accountId, courseId);
    res.status(200).json(jiraBoards);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error fetching teams:', error);
      res.status(500).json({ error: 'Failed to fetch teams' });
    }
  }
};
