import { Request, Response } from 'express';
import {
  getAssessment,
  updateAssessmentResultMarker,
  uploadAssessmentResults,
} from '../services/assessmentService';

interface ResultItem {
  teamNumber: number;
  studentId: string;
  mark: number;
}

export const getAssessmentById = async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const assessment = await getAssessment(assessmentId);
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    res.status(200).json(assessment);
  } catch (error) {
    res.status(400).json({ error: 'Failed to retrieve assessment' });
  }
};

export const uploadResults = async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const results = req.body.items as ResultItem[];
    await uploadAssessmentResults(assessmentId, results);
    res.status(200).json({ message: 'Results uploaded successfully' });
  } catch (error) {
    console.error('Error uploading results:', error);
    res.status(500).json({ error: 'Failed to upload results' });
  }
};

export const updateResultMarker = async (req: Request, res: Response) => {
  try {
    const { assessmentId, resultId } = req.params;
    const { markerId } = req.body;
    await updateAssessmentResultMarker(assessmentId, resultId, markerId);
    res.status(200).json({ message: 'Marker updated successfully' });
  } catch (error) {
    console.error('Error updating marker:', error);
    res.status(500).json({ error: 'Failed to update marker' });
  }
};
