// services/assessmentAssignmentSetService.ts

import mongoose from 'mongoose';
import AssessmentAssignmentSetModel, { AssessmentAssignmentSet, AssignedTeam } from '../models/AssessmentAssignmentSet';
import InternalAssessmentModel from '../models/InternalAssessment';
import TeamSetModel from '../models/TeamSet';
import TeamModel from '../models/Team';
import UserModel from '../models/User';
import { NotFoundError, BadRequestError } from './errors';

/**
 * Creates a new AssessmentAssignmentSet based on the provided assessment and original TeamSet.
 * @param assessmentId - The ID of the assessment.
 * @param originalTeamSetId - The ID of the original TeamSet.
 * @returns The created AssessmentAssignmentSet document.
 */
export const createAssignmentSet = async (
  assessmentId: string,
  originalTeamSetId: string
): Promise<AssessmentAssignmentSet> => {
  // Validate assessment existence
  const assessment = await InternalAssessmentModel.findById(assessmentId);
  if (!assessment) {
    throw new NotFoundError('Assessment not found');
  }

  // Prevent duplicate AssignmentSets for the same assessment
  const existingSet = await AssessmentAssignmentSetModel.findOne({ assessment: assessmentId });
  if (existingSet) {
    throw new BadRequestError('AssessmentAssignmentSet already exists for this assessment');
  }

  // Retrieve the original TeamSet
  const teamSet = await TeamSetModel.findById(originalTeamSetId).populate('teams');
  if (!teamSet) {
    throw new NotFoundError('Original TeamSet not found');
  }

  const originalTeams = teamSet.teams.map((team: any) => team._id);

  // Initialize assignedTeams with original TAs
  const assignedTeams: AssignedTeam[] = teamSet.teams.map((team: any) => ({
    team: team._id,
    tas: team.TA ? [team.TA] : [],
  }));

  // Create the AssessmentAssignmentSet document
  const assignmentSet = new AssessmentAssignmentSetModel({
    assessment: assessmentId,
    originalTeams,
    assignedTeams,
  });

  await assignmentSet.save();

  return assignmentSet;
};

/**
 * Retrieves the AssessmentAssignmentSet for a specific assessment.
 * @param assessmentId - The ID of the assessment.
 * @returns The AssessmentAssignmentSet document.
 */
export const getAssignmentSetByAssessmentId = async (
  assessmentId: string
): Promise<AssessmentAssignmentSet> => {
  const assignmentSet = await AssessmentAssignmentSetModel.findOne({ assessment: assessmentId })
    .populate({
      path: 'originalTeams',
      populate: { path: 'members', select: 'name identifier' },
    })
    .populate({
      path: 'assignedTeams.tas',
      select: 'name identifier',
    })
    .populate({
      path: 'assignedTeams.team',
      populate: { path: 'members', select: 'name identifier' },
    });

  if (!assignmentSet) {
    throw new NotFoundError('AssessmentAssignmentSet not found');
  }

  return assignmentSet;
};

/**
 * Updates the assignedTeams within an AssessmentAssignmentSet.
 * @param assessmentId - The ID of the assessment.
 * @param assignedTeams - The new array of AssignedTeam objects.
 * @returns The updated AssessmentAssignmentSet document.
 */
export const updateAssignmentSet = async (
  assessmentId: string,
  assignedTeams: AssignedTeam[]
): Promise<AssessmentAssignmentSet> => {
  const assignmentSet = await AssessmentAssignmentSetModel.findOne({ assessment: assessmentId });
  if (!assignmentSet) {
    throw new NotFoundError('AssessmentAssignmentSet not found');
  }

  // Validate each AssignedTeam
  for (const at of assignedTeams) {
    const team = await TeamModel.findById(at.team);
    if (!team) {
      throw new NotFoundError(`Team with ID ${at.team} not found`);
    }
    // Validate each TA
    for (const taId of at.tas) {
      const ta = await UserModel.findById(taId);
      if (!ta) {
        throw new NotFoundError(`TA with ID ${taId} not found`);
      }
    }
  }

  // Update the assignedTeams field
  assignmentSet.assignedTeams = assignedTeams.map((at) => ({
    team: at.team,
    tas: at.tas,
  }));

  await assignmentSet.save();

  return assignmentSet;
};

/**
 * Deletes the AssessmentAssignmentSet for a specific assessment.
 * @param assessmentId - The ID of the assessment.
 */
export const deleteAssignmentSet = async (assessmentId: string): Promise<void> => {
  const assignmentSet = await AssessmentAssignmentSetModel.findOneAndDelete({ assessment: assessmentId });
  if (!assignmentSet) {
    throw new NotFoundError('AssessmentAssignmentSet not found');
  }
};

/**
 * Retrieves all teams assigned to a specific TA within an assessment.
 * @param taId - The ID of the TA.
 * @param assessmentId - The ID of the assessment.
 * @returns An array of Team ObjectIds.
 */
export const getAssignmentsByTAId = async (
  taId: string,
  assessmentId: string
): Promise<mongoose.Types.ObjectId[]> => {
  const assignmentSet = await AssessmentAssignmentSetModel.findOne({ assessment: assessmentId })
    .populate({
      path: 'assignedTeams.tas',
      match: { _id: taId },
      select: 'name identifier',
    })
    .populate('assignedTeams.team');

  if (!assignmentSet) {
    throw new NotFoundError('AssessmentAssignmentSet not found');
  }

  // Filter teams where the TA is assigned
  const teamIds: mongoose.Types.ObjectId[] = assignmentSet.assignedTeams
    .filter((at) => at.tas.length > 0)
    .map((at) => at.team as mongoose.Types.ObjectId);

  return teamIds;
};
