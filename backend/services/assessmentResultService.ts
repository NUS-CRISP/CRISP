/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import AssessmentAssignmentSetModel from '../models/AssessmentAssignmentSet';
import AssessmentResultModel, {
  AssessmentResult,
} from '../models/AssessmentResult';
import { BadRequestError, NotFoundError } from './errors';
import { Team } from '@models/Team';
import { User } from '@models/User';

/**
 * Retrieves all AssessmentResults for a given assessment. If certain students
 * (from assigned teams or assigned users) do not have an AssessmentResult yet,
 * a new one is created for each with no marks and an averageScore of 0.
 *
 * @param {string} assessmentId - The ID of the assessment.
 * @returns {Promise<AssessmentResult[]>} - An array of populated AssessmentResult documents.
 *
 * @throws {BadRequestError} If the assessmentId is invalid or no students are assigned.
 * @throws {NotFoundError} If the assignment set for the assessment is not found.
 * @throws {Error} For any unknown runtime or server errors (500).
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

  if (
    (!assignmentSet.assignedTeams ||
      assignmentSet.assignedTeams.length === 0) &&
    (!assignmentSet.assignedUsers || assignmentSet.assignedUsers.length === 0)
  ) {
    throw new BadRequestError(
      'AssessmentAssignmentSet does not have assignments'
    );
  }

  // Collect all student IDs from assigned teams or assigned users
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

  // Fetch existing AssessmentResults for those students in this assessment
  const existingResults = await AssessmentResultModel.find({
    assessment: assessmentId,
    student: { $in: allStudentIds },
  })
    .select('student')
    .populate('marks.submission');

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

  // Insert new AssessmentResults in bulk if any are missing
  if (newAssessmentResults.length > 0) {
    await AssessmentResultModel.insertMany(newAssessmentResults);
  }

  // Refetch all results (including newly inserted ones)
  const allAssessmentResults = await AssessmentResultModel.find({
    assessment: assessmentId,
    student: { $in: allStudentIds },
  })
    .populate('student', 'name email')
    .populate('marks.submission')
    .populate('marks.marker');

  return allAssessmentResults;
};

/**
 * Recalculates the average score for a single AssessmentResult.
 *
 * @param {string} resultId - The ID of the AssessmentResult to recalculate.
 * @returns {Promise<void>} - Resolves upon successful recalculation.
 *
 * @throws {NotFoundError} If the AssessmentResult specified by resultId is not found.
 * @throws {BadRequestError} If the result has no marks to recalculate.
 * @throws {Error} For any unknown runtime or server errors (500).
 */
export const recalculateResult = async (resultId: string): Promise<void> => {
  const result: any = await AssessmentResultModel.findById(resultId)
    .populate('marks.submission.adjustedScore')
    .populate('marks.submission.score')
    .populate('averageScore'); // Possibly extraneous, but left for consistency.

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

  const totalScore = result.marks.reduce(
    (accumulator: number, markEntry: any) => accumulator + markEntry.score,
    0
  );
  result.averageScore = totalScore / result.marks.length;
  await result.save();
};
