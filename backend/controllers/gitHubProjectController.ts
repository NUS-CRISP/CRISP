import { Request, Response } from 'express';
import { MissingAuthorizationError, NotFoundError } from '../services/errors';
import { getGitHubProjectNamesByCourse } from '../services/gitHubProjectService';
import { getAccountId } from '../utils/auth';

export const getAllGitHubProjectNamesByCourse = async (
  req: Request,
  res: Response
) => {
  const courseId = req.params.id;

  try {
    const accountId = await getAccountId(req);
    const gitHubProjects = await getGitHubProjectNamesByCourse(
      accountId,
      courseId
    );
    res.status(200).json(gitHubProjects);
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
