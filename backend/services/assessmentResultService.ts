/* eslint-disable @typescript-eslint/no-explicit-any */
// services/assessmentResultService.ts

import mongoose from 'mongoose';
import AssessmentAssignmentSetModel from '../models/AssessmentAssignmentSet';
import AssessmentResultModel, {
  AssessmentResult,
} from '../models/AssessmentResult';
import { BadRequestError, NotFoundError } from './errors';
import { Team } from '@models/Team';
import { User } from '@models/User';

/**
 * Retrieves all AssessmentResults for a given assessment.
 * For students associated with the assessment who do not have an AssessmentResult,
 * creates a new AssessmentResult with no marks and an averageScore of 0.
 *
 * @param assessmentId - The ID of the assessment.
 * @returns A promise that resolves to an array of AssessmentResults.
 */
export const getOrCreateAssessmentResults = async (
  assessmentId: string
): Promise<AssessmentResult[]> => {
  // Validate the assessmentId
  if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
    throw new BadRequestError('Invalid assessment ID format.');
  }

  // Fetch the AssessmentAssignmentSet for the given assessment
  const assignmentSet = await AssessmentAssignmentSetModel.findOne({
    assessment: assessmentId,
  })
    .populate({
      path: 'assignedTeams.team',
      populate: {
        path: 'members',
        model: 'User',
      },
    })
    .populate({
      path: 'assignedUsers',
      populate: {
        path: 'user',
        model: 'User',
      },
    });

  if (!assignmentSet) {
    throw new NotFoundError(
      'AssessmentAssignmentSet not found for the given assessment.'
    );
  }

  if ((!assignmentSet.assignedTeams || assignmentSet.assignedTeams.length === 0)
    && (!assignmentSet.assignedUsers || assignmentSet.assignedUsers.length === 0)) {
    throw new BadRequestError('AssessmentAssignmentSet does not have assignments');
  }

  // Extract all student IDs from the assigned teams
  const studentIdSet = new Set<string>();
  if (assignmentSet.assignedTeams && assignmentSet.assignedTeams.length > 0) {
    for (const assignedTeam of assignmentSet.assignedTeams) {
      const team = assignedTeam.team as Team;
      if (team && team.members && Array.isArray(team.members)) {
        for (const member of team.members) {
          studentIdSet.add(member._id.toString());
        }
      }
    }
  } else {
    for (const assignedUser of assignmentSet.assignedUsers!) {
      const user = assignedUser.user as User;
      studentIdSet.add(user._id.toString());
    }
  }

  const allStudentIds = Array.from(studentIdSet);

  if (allStudentIds.length === 0) {
    throw new BadRequestError(
      'No students found in the AssessmentAssignmentSet.'
    );
  }

  // Fetch existing AssessmentResults for the assessment
  const existingResults = await AssessmentResultModel.find({
    assessment: assessmentId,
    student: { $in: allStudentIds },
  }).select('student').populate('marks.submission');
  console.log(existingResults[50])

  const existingStudentIds = new Set<string>(
    existingResults.map(result => result.student.toString())
  );

  // Determine which students are missing AssessmentResults
  const missingStudentIds = allStudentIds.filter(
    studentId => !existingStudentIds.has(studentId)
  );

  // Prepare new AssessmentResult documents for missing students
  const newAssessmentResults = missingStudentIds.map(studentId => ({
    assessment: assessmentId,
    student: studentId,
    marks: [],
    averageScore: 0,
  }));

  // Bulk insert new AssessmentResults if there are any missing
  if (newAssessmentResults.length > 0) {
    await AssessmentResultModel.insertMany(newAssessmentResults);
  }

  // Fetch and return all AssessmentResults for the assessment
  const allAssessmentResults = await AssessmentResultModel.find({
    assessment: assessmentId,
    student: { $in: allStudentIds },
  })
    .populate('student', 'name email') // Populate student details as needed
    .populate('marks.submission')
    .populate('marks.marker'); // Populate submission details if necessary

  return allAssessmentResults;
};

export const recalculateResult = async (resultId: string) => {
  const result: any = await AssessmentResultModel.findById(resultId)
    .populate('marks.submission.adjustedScore')
    .populate('marks.submission.score')
    .populate('averageScore');
  if (!result) {
    throw new NotFoundError('Result not found' + resultId);
  }

  if (result.marks.length === 0) {
    throw new BadRequestError('No marks to recalculate');
  } else {
    console.log('Result:', result);
    result.marks.forEach((markEntry: any, index: any) => {
      console.log(`Mark Entry ${index}:`, markEntry);
    });
  }

  result.averageScore =
    result.marks.reduce(
      (accumulator: number, markEntry: any) => accumulator + markEntry.score,
      0
    ) / result.marks.length;
  result.save();
};
