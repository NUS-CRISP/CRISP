import { Request, Response } from 'express';
import Assessment from '../models/Assessment';

export const getAssessmentById = async (req: Request, res: Response) => {
  try {
    const assessmentId = req.params.id;
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    res.status(200).json(assessment);
  } catch (error) {
    res.status(400).json({ error: 'Failed to retrieve assessment' });
  }
};
