import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import Assessment from '../models/Assessment';
import Result, { Result as IResult } from '../models/Result';
import Team, { Team as ITeam } from '../models/Team';
import Course from '../models/Course';
import TeamSet from '../models/TeamSet';
import { BadRequestError, NotFoundError } from './errors';

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

interface AssessmentData {
  assessmentType: string;
  markType: string;
  frequency: string;
  granularity: string;
  teamSetName?: string;
  formLink?: string;
}

export const addAssessmentsToCourse = async (
  courseId: string,
  assessmentsData: AssessmentData[]
) => {
  if (!Array.isArray(assessmentsData) || assessmentsData.length === 0) {
    throw new BadRequestError('Invalid or empty assessments data');
  }
  const course = await Course.findById(courseId).populate('students');
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  const newAssessments: mongoose.Document[] = [];
  for (const data of assessmentsData) {
    const {
      assessmentType,
      markType,
      frequency,
      granularity,
      teamSetName,
      formLink,
    } = data;
    const existingAssessment = await Assessment.findOne({
      course: courseId,
      assessmentType,
    });
    if (existingAssessment) {
      continue;
    }
    const assessment = new Assessment({
      course: courseId,
      assessmentType,
      markType,
      results: [],
      frequency,
      granularity,
      teamSet: null,
      formLink,
    });
    await assessment.save();
    const results: mongoose.Document[] = [];
    if (granularity === 'team') {
      const teamSet = await TeamSet.findOne({
        course: courseId,
        name: teamSetName,
      }).populate({ path: 'teams', populate: ['members', 'TA'] });
      if (!teamSet) {
        continue;
      }
      assessment.teamSet = teamSet._id;
      // Create a result object for each team
      teamSet.teams.forEach((team: any) => {
        const initialMarks = team.members.map((member: any) => ({
          user: member.identifier,
          name: member.name,
          mark: 0,
        }));
        const result = new Result({
          assessment: assessment._id,
          team: team._id,
          marker: team.TA?._id,
          marks: initialMarks,
        });
        results.push(result);
      });
    } else {
      // Create a result object for each student
      course.students.forEach((student: any) => {
        const result = new Result({
          assessment: assessment._id,
          team: null,
          marker: null,
          marks: [
            {
              user: student.identifier,
              name: student.name,
              mark: 0,
            },
          ],
        });
        results.push(result);
      });
    }
    assessment.results = results.map(result => result._id);
    course.assessments.push(assessment._id);
    newAssessments.push(assessment);
    await Promise.all(results.map(result => result.save()));
  }
  if (newAssessments.length === 0) {
    throw new BadRequestError('Failed to add any assessments');
  }
  await course.save();
  await Promise.all(newAssessments.map(assessment => assessment.save()));
};
