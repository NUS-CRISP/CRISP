import { Request, Response } from 'express';
import Assessment from '../models/Assessment';
import Result, { Result as IResult } from '../models/Result';
import Team, { Team as ITeam } from '../models/Team';

interface ResultItem {
  teamNumber: number;
  studentId: string;
  mark: number;
}

export const getAssessmentById = async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.params;
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

export const uploadResults = async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const results = req.body.items as ResultItem[];

    const assessment = await Assessment.findById(assessmentId).populate({
      path: 'results',
      populate: {
        path: 'team',
        model: Team,
      },
    });
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    if (assessment.granularity == 'individual') {
      const resultMap: Record<string, number> = {};
      results.forEach(({ studentId, mark }) => {
        resultMap[studentId] = mark;
      });

      for (const result of assessment.results as unknown as IResult[]) {
        const userId = result.marks[0]?.userId;
        const mark = resultMap[userId];
        if (mark !== undefined) {
          result.marks[0].mark = mark;
          await result.save();
        }
      }
    } else {
      const resultMap: Record<number, Record<string, number>> = {};
      results.forEach(({ teamNumber, studentId, mark }) => {
        if (!resultMap[teamNumber]) {
          resultMap[teamNumber] = {};
        }
        resultMap[teamNumber][studentId] = mark;
      });

      for (const result of assessment.results as unknown as IResult[]) {
        const team = result.team as unknown as ITeam;

        if (!team || !team.number) {
          continue;
        }
        const teamResults = resultMap[team.number];

        if (teamResults) {
          result.marks.forEach(markEntry => {
            const mark = teamResults[markEntry.userId];
            if (mark !== undefined) {
              markEntry.mark = mark;
            }
          });
          await result.save();
        }
      }
    }

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
