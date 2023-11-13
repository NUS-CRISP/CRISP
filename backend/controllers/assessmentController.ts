import { Request, Response } from 'express';
import Assessment from '../models/Assessment';
import Result from '../models/Result';

export const getAssessmentById = async (req: Request, res: Response) => {
  try {
    const assessmentId = req.params.id;
    const assessment = await Assessment.findById(assessmentId).populate({
      path: 'results',
      populate: ['team', 'marker'],
    });
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    res.status(200).json(assessment);
  } catch (error) {
    res.status(400).json({ error: 'Failed to retrieve assessment' });
  }
};

export const updateResultMarker = async (req: Request, res: Response) => {
  try {
    const { assessmentId, resultId } = req.params;
    const { markerId } = req.body;

    const assessment =
      await Assessment.findById(assessmentId).populate('results');
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    const resultToUpdate = await Result.findById(resultId);

    if (!resultToUpdate || !resultToUpdate.assessment.equals(assessment._id)) {
      return res.status(404).json({ error: 'Result not found' });
    }

    resultToUpdate.marker = markerId;

    await resultToUpdate.save();

    res.status(200).json({ message: 'Marker updated successfully' });
  } catch (error) {
    console.error('Error updating marker:', error);
    res.status(500).json({ error: 'Failed to update marker' });
  }
};
