import { Request, Response } from 'express';
import {
  deleteAssessmentById,
  getAssessmentById,
  updateAssessmentById,
  updateAssessmentResultMarkerById,
  uploadAssessmentResultsById,
} from '../services/assessmentService';
import { BadRequestError, NotFoundError } from '../services/errors';

import {
  fetchAndSaveSheetData,
  getAssessmentSheetData,
} from '../services/googleService';
import { getAccountId } from '../utils/auth';

export const getAssessment = async (req: Request, res: Response) => {
  try {
    const accountId = await getAccountId(req);

    if (!accountId) {
      res.status(400).json({ error: 'Missing authorization' });
      return;
    }
    const { assessmentId } = req.params;
    const assessment = await getAssessmentById(assessmentId, accountId);
    res.status(200).json(assessment);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error retrieving assessment:', error);
      res.status(500).json({ error: 'Failed to retrieve assessment' });
    }
  }
};

export const updateAssessment = async (req: Request, res: Response) => {
  const accountId = await getAccountId(req);
  if (!accountId) {
    res.status(400).json({ error: 'Missing authorization' });
    return;
  }
  const { assessmentId } = req.params;
  const updateData = req.body;
  try {
    await updateAssessmentById(assessmentId, accountId, updateData);
    res.status(200).json({ message: 'Assessment updated successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof BadRequestError) {
      res.status(400).json({ error: error.message });
    } else {
      console.error('Error updating assessment:', error);
      res.status(500).json({ error: 'Failed to update assessment' });
    }
  }
};

export const deleteAssessment = async (req: Request, res: Response) => {
  const accountId = await getAccountId(req);
  if (!accountId) {
    res.status(400).json({ error: 'Missing authorization' });
    return;
  }
  const { assessmentId } = req.params;
  try {
    await deleteAssessmentById(assessmentId);
    return res.status(200).json({ message: 'Assessment deleted successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).send({ error: error.message });
    } else {
      console.error('Error deleting Assessment:', error);
      res.status(500).json({ error: 'Failed to delete Assessment' });
    }
  }
};

export const uploadResults = async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const results = req.body.items;
    await uploadAssessmentResultsById(assessmentId, results);
    res.status(200).json({ message: 'Results uploaded successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error uploading results:', error);
      res.status(500).json({ error: 'Failed to upload results' });
    }
  }
};

export const updateResultMarker = async (req: Request, res: Response) => {
  try {
    const { assessmentId, resultId } = req.params;
    const { markerId } = req.body;
    await updateAssessmentResultMarkerById(assessmentId, resultId, markerId);
    res.status(200).json({ message: 'Marker updated successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error updating result marker:', error);
      res.status(500).json({ error: 'Failed to update result marker' });
    }
  }
};

/*----------------------------------------Google Sheets----------------------------------------*/
export const getSheetData = async (req: Request, res: Response) => {
  const { assessmentId } = req.params;
  const accountId = await getAccountId(req);
  if (!accountId) {
    res.status(400).json({ error: 'Missing authorization' });
    return;
  }
  try {
    const sheetsData = await getAssessmentSheetData(assessmentId, accountId);
    res.status(200).json(sheetsData);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error getting sheets data:', error);
      res.status(500).json({ error: 'Failed to get sheets data' });
    }
  }
};

export const fetchNewSheetData = async (req: Request, res: Response) => {
  const { assessmentId } = req.params;
  const isTeam = req.body.isTeam;

  try {
    await fetchAndSaveSheetData(assessmentId, isTeam);
    res.status(201).json({ message: 'Sheets Updated successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error fetching new sheets data:', error);
      res.status(500).json({ error: 'Failed to fetch new sheets data' });
    }
  }
};
