import { Request, Response } from 'express';
import {
  fetchAllCodeAnalysisData,
  fetchAllCodeAnalysisDataForOrg,
  getAuthorizedCodeAnalysisDataByCourse,
} from 'services/codeAnalysisService';
import { MissingAuthorizationError, NotFoundError } from 'services/errors';
import { getAccountId } from 'utils/auth';

export const getAllCodeAnalysisData = async (req: Request, res: Response) => {
  try {
    const codeAnalysisData = await fetchAllCodeAnalysisData();
    return res.status(200).json({ codeAnalysisData });
  } catch (error) {
    console.error('Error retrieving all code analysis data:', error);
    return res
      .status(500)
      .json({ error: 'Failed to get all code analysis data' });
  }
};

export const getAllCodeAnalysisDataByOrg = async (
  req: Request,
  res: Response
) => {
  try {
    const codeAnalysisDataas = await fetchAllCodeAnalysisDataForOrg(
      req.params.gitHubOrgName
    );
    return res.status(200).json(codeAnalysisDataas);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ message: error.message });
    } else {
      console.error('Error retrieving team datas for org:', error);
      return res
        .status(500)
        .json({ error: 'Failed to get team datas for org' });
    }
  }
};

export const getAllCodeAnalysisDataByCourse = async (
  req: Request,
  res: Response
) => {
  const courseId = req.params.id;

  try {
    const accountId = await getAccountId(req);
    const codeAnalyses = await getAuthorizedCodeAnalysisDataByCourse(
      accountId,
      courseId
    );
    res.status(200).json(codeAnalyses);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof MissingAuthorizationError) {
      res.status(400).json({ error: 'Missing authorization' });
    } else {
      console.error('Error fetching teams:', error);
      res.status(500).json({ error: 'Failed to fetch code analyses' });
    }
  }
};
