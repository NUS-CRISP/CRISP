/* eslint-disable @typescript-eslint/no-explicit-any */
// services/assessmentAssignmentSetService.ts

import mongoose from 'mongoose';
import AssessmentAssignmentSetModel, { AssessmentAssignmentSet, AssignedTeam, AssignedUser } from '../models/AssessmentAssignmentSet';
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
  originalTeamSetId?: string
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
  const teamSet = await TeamSetModel.findById(originalTeamSetId ?? assessment.teamSet?._id).populate('teams');
  if (!teamSet) {
    throw new NotFoundError('Original TeamSet not found');
  }

  const originalTeams = teamSet.teams.map((team: any) => team._id);

  // Initialize assignments based on granularity
  const assignedTeams: AssignedTeam[] | null = assessment.granularity === 'team'
  ? teamSet.teams.map((team: any) => ({
    team: team._id,
    tas: team.TA ? [team.TA] : [],
  }))
  : null;

  const assignedUsers: AssignedUser[] | null = assessment.granularity === 'individual'
  ? teamSet.teams.flatMap((team: any) => {
    const userAssignments: AssignedUser[] = team.members.map((user: any) => ({
      user: user._id,
      tas: team.TA ? [team.TA] : [],
    }));
    return userAssignments;
  })
  : null

  // Create the AssessmentAssignmentSet document
  const assignmentSet = new AssessmentAssignmentSetModel({
    assessment: assessmentId,
    originalTeams,
    assignedTeams,
    assignedUsers,
  });

  await assignmentSet.save();

  // Link the assignment set to the InternalAssessment
  assessment.assessmentAssignmentSet = assignmentSet._id;
  await assessment.save();

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
    })
    .populate({
      path: 'assignedTeams.team',
      populate: { path: 'TA', select: 'name identifier' },
    })
    .populate({
      path: 'assignedUsers.tas',
      select: 'name identifier',
    })
    .populate({
      path: 'assignedUsers.user',
      select: 'name identifier',
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
  assignedTeams?: AssignedTeam[],
  assignedUsers?: AssignedUser[],
): Promise<AssessmentAssignmentSet> => {
  let assignmentSet = await AssessmentAssignmentSetModel.findOne({ assessment: assessmentId });
  if (!assignmentSet) {
    await createAssignmentSet(assessmentId);
    assignmentSet = await AssessmentAssignmentSetModel.findOne({ assessment: assessmentId });
    if (!assignmentSet) {
      throw new NotFoundError('Invalid assignment id')
    }
  }

  if (assignedTeams) {
    // Validate each AssignedTeam
    for (const at of assignedTeams) {
      const team = await TeamModel.findById(at.team);
      if (!team) {
        throw new NotFoundError(`Team with ID ${at.team} not found`);
      }
      // Validate each TA (Just user check for now, TODO: Add actual checking + faculty bypass)
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
  } else {
    // Validate each AssignedUser
    for (const at of assignedUsers!) {
      const user = await UserModel.findById(at.user);
      if (!user) {
        throw new NotFoundError(`User with ID ${at.user} not found`);
      }
      // Validate each TA (Just user check for now, TODO: Add actual checking + faculty bypass)
      for (const taId of at.tas) {
        const ta = await UserModel.findById(taId);
        if (!ta) {
          throw new NotFoundError(`TA with ID ${taId} not found`);
        }
      }
    }

    // Update the assignedUsers field
    assignmentSet.assignedUsers = assignedUsers!.map((at) => ({
      user: at.user,
      tas: at.tas,
    }));

    await assignmentSet.save();
  }
  return assignmentSet;
};

/**
 * Retrieves all assignments to a specific TA within an assessment.
 * @param taId - The ID of the TA.
 * @param assessmentId - The ID of the assessment.
 * @returns An array of Teams OR Users. (Not AssignedTeams or AssignedUsers)
 */
export const getAssignmentsByTAId = async (
  taId: string,
  assessmentId: string
) => {
  const assignmentSet = await AssessmentAssignmentSetModel.findOne({ assessment: assessmentId })
    .populate({
      path: 'assignedTeams.tas',
      match: { _id: taId },
      select: 'name identifier',
    })
    .populate('assignedTeams.team.members')
    .populate({
      path: 'assignedUsers.tas',
      match: { _id: taId },
      select: 'name identifier',
    })
  if (!assignmentSet) {
    throw new NotFoundError('AssessmentAssignmentSet not found');
  }

  if (assignmentSet.assignedTeams) {
    // Filter teams where the TA is assigned
    const teamIds: mongoose.Types.ObjectId[] = assignmentSet.assignedTeams
      .filter((at) => at.tas.length > 0)
      .map((at) => at.team as mongoose.Types.ObjectId);

    const teams = await Promise.all(teamIds.map(async (teamId) => {
      return await TeamModel.findById(teamId).populate('members');
    }));
    return teams;
  } else {
    const userIds: mongoose.Types.ObjectId[] = assignmentSet.assignedUsers!
      .filter((at) => at.tas.length > 0)
      .map((at) => at.user as mongoose.Types.ObjectId);

    const users = await Promise.all(userIds.map(async (userId) => {
      return await UserModel.findById(userId);
    }));
    return users;
  }
};
