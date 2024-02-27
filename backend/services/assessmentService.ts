import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import AssessmentModel from '../models/Assessment';
import ResultModel, { Result } from '../models/Result';
import { Team } from '../models/Team';
import CourseModel from '../models/Course';
import TeamSetModel from '../models/TeamSet';
import { BadRequestError, NotFoundError } from './errors';
import AccountModel from '../models/Account';

interface ResultItem {
  teamNumber: number;
  studentId: string;
  mark: number;
}

export const getAssessmentById = async (
  assessmentId: string,
  accountId: string
) => {
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }
  const assessment = await AssessmentModel.findById(assessmentId).populate<{
    results: Result[];
  }>({
    path: 'results',
    populate: [
      {
        path: 'team',
        model: 'Team',
        populate: {
          path: 'members',
          model: 'User',
        },
      },
      {
        path: 'marker',
        model: 'User',
      },
    ],
  });
  if (!assessment) {
    throw new NotFoundError('Assessment not found');
  }
  const role = account.role;
  if (role === 'Teaching assistant') {
    const userId = account.user;
    assessment.results = assessment.results.filter(result =>
      result.marker?.equals(userId)
    );
  }
  if (assessment.granularity === 'individual') {
    assessment.results.sort((a, b) =>
      a.marks[0].name.localeCompare(b.marks[0].name)
    );
  } else if (assessment.granularity === 'team') {
    assessment.results.sort((a, b) => {
      const teamA = a.team as unknown as Team;
      const teamB = b.team as unknown as Team;
      if (!teamA && !teamB) return 0;
      if (!teamA) return -1;
      if (!teamB) return 1;
      return teamA.number - teamB.number;
    });
    assessment.results.forEach(result => {
      result.marks.sort((a, b) => a.name.localeCompare(b.name));
    });
  }
  return assessment;
};

export const uploadAssessmentResultsById = async (
  assessmentId: string,
  results: ResultItem[]
) => {
  const assessment = await AssessmentModel.findById(assessmentId).populate({
    path: 'results',
    populate: {
      path: 'team',
      model: 'Team',
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
    for (const result of assessment.results as unknown as Result[]) {
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
  for (const result of assessment.results as unknown as Result[]) {
    const team = result.team as unknown as Team;
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
    await AssessmentModel.findById(assessmentId).populate('results');
  if (!assessment) {
    throw new NotFoundError('Assessment not found');
  }
  const resultToUpdate = await ResultModel.findById(resultId);
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
  sheetID?: string;
}

export const addAssessmentsToCourse = async (
  courseId: string,
  assessmentsData: AssessmentData[]
) => {
  if (!Array.isArray(assessmentsData) || assessmentsData.length === 0) {
    throw new BadRequestError('Invalid or empty assessments data');
  }
  const course = await CourseModel.findById(courseId).populate('students');
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
      sheetID,
    } = data;
    const existingAssessment = await AssessmentModel.findOne({
      course: courseId,
      assessmentType,
    });
    if (existingAssessment) {
      continue;
    }
    const assessment = new AssessmentModel({
      course: courseId,
      assessmentType,
      markType,
      results: [],
      frequency,
      granularity,
      teamSet: null,
      formLink,
      sheetID,
    });
    await assessment.save();
    const results: mongoose.Document[] = [];
    const teamSet = await TeamSetModel.findOne({
      course: courseId,
      name: teamSetName,
    }).populate({ path: 'teams', populate: ['members', 'TA'] });
    if (granularity === 'team') {
      if (!teamSet) {
        continue;
      }
      assessment.teamSet = teamSet._id;
      teamSet.teams.forEach((team: any) => {
        const initialMarks = team.members.map((member: any) => ({
          user: member.identifier,
          name: member.name,
          mark: 0,
        }));
        const result = new ResultModel({
          assessment: assessment._id,
          team: team._id,
          marker: team.TA?._id,
          marks: initialMarks,
        });
        results.push(result);
      });
    } else {
      if (teamSet) {
        assessment.teamSet = teamSet._id;
        course.students.forEach((student: any) => {
          const teams: Team[] = teamSet.teams as unknown as Team[];
          const team = teams.find(t =>
            t?.members?.some(member => member._id.equals(student._id))
          );
          const marker = team?.TA?._id || null;
          const result = new ResultModel({
            assessment: assessment._id,
            marker,
            marks: [{ user: student.identifier, name: student.name, mark: 0 }],
          });
          results.push(result);
        });
      } else {
        course.students.forEach((student: any) => {
          const result = new ResultModel({
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
