import { ObjectId } from 'mongodb';
import Assessment from '../models/Assessment';
import Result, { Result as IResult } from '../models/Result';
import Team, { Team as ITeam } from '../models/Team';
import { NotFoundError } from './errors';

interface ResultItem {
  teamNumber: number;
  studentId: string;
  mark: number;
}

export const getAssessmentById = async (assessmentId: string) => {
  const assessment = await Assessment.findById(assessmentId).populate({
    path: 'results',
    populate: ['team', 'marker'],
  });
  if (!assessment) {
    throw new NotFoundError('Assessment not found');
  }
  return assessment;
};

export const uploadAssessmentResultsById = async (
  assessmentId: string,
  results: ResultItem[]
) => {
  const assessment = await Assessment.findById(assessmentId).populate({
    path: 'results',
    populate: {
      path: 'team',
      model: Team,
    },
  });
  if (!assessment) {
    throw new NotFoundError('Assessment not found');
  }
  if (assessment.granularity == 'individual') {
    const resultMap: Record<string, number> = {};
    results.forEach(({ studentId, mark }) => {
      resultMap[studentId] = mark;
    });
    for (const result of assessment.results as unknown as IResult[]) {
      const userId = result.marks[0]?.user;
      const mark = resultMap[userId];
      if (mark !== undefined) {
        result.marks[0].mark = mark;
        await result.save();
      }
    }
    return;
  }
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
        const mark = teamResults[markEntry.user];
        if (mark !== undefined) {
          markEntry.mark = mark;
        }
      });
      await result.save();
    }
  }
};

export const updateAssessmentResultMarkerById = async (
  assessmentId: string,
  resultId: string,
  markerId: string
) => {
  const assessment =
    await Assessment.findById(assessmentId).populate('results');
  if (!assessment) {
    throw new NotFoundError('Assessment not found');
  }
  const resultToUpdate = await Result.findById(resultId);
  if (!resultToUpdate || !resultToUpdate.assessment.equals(assessment._id)) {
    throw new NotFoundError('Result not found');
  }
  resultToUpdate.marker = markerId as unknown as ObjectId;
  await resultToUpdate.save();
};
