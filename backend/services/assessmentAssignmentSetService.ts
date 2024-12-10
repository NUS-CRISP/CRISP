/* eslint-disable @typescript-eslint/no-explicit-any */
// services/assessmentAssignmentSetService.ts

import mongoose from 'mongoose';
import AssessmentAssignmentSetModel, {
  AssessmentAssignmentSet,
  AssignedTeam,
  AssignedUser,
} from '../models/AssessmentAssignmentSet';
import InternalAssessmentModel from '../models/InternalAssessment';
import TeamSetModel from '../models/TeamSet';
import TeamModel, { Team } from '../models/Team';
import UserModel, { User } from '../models/User';
import { NotFoundError, BadRequestError } from './errors';
import { getSubmissionsByAssessmentAndUser } from './submissionService';
import { TeamMemberSelectionAnswer } from '@models/Answer';

/**
 * Utility: Assign a random TA from a given pool to a team or user without TAs.
 * @param entities - The array of AssignedTeam or AssignedUser entities.
 * @param pool - An array of TAs (Users) available for assignment.
 */
function ensureAtLeastOneTA(
  entities: (AssignedTeam | AssignedUser)[],
  pool: mongoose.Types.ObjectId[]
) {
  for (const entity of entities) {
    if (entity.tas.length === 0 && pool.length > 0) {
      // Assign a random TA from the pool
      const randomTaId = pool[Math.floor(Math.random() * pool.length)];
      entity.tas = [randomTaId];
    }
  }
}

/**
 * Creates a new AssessmentAssignmentSet based on the provided assessment and original TeamSet.
 * When created, if granularity is 'team', any team without a TA is assigned a random TA from other teams that have TAs.
 * Similarly, if granularity is 'individual', any user without a TA is assigned a random TA from other users that have TAs.
 * @param assessmentId - The ID of the assessment.
 * @param originalTeamSetId - The ID of the original TeamSet.
 * @returns The created AssessmentAssignmentSet document.
 */
export const createAssignmentSet = async (
  assessmentId: string,
  originalTeamSetId?: string
): Promise<AssessmentAssignmentSet> => {
  const assessment = await InternalAssessmentModel.findById(assessmentId);
  if (!assessment) {
    throw new NotFoundError('Assessment not found');
  }

  const existingSet = await AssessmentAssignmentSetModel.findOne({
    assessment: assessmentId,
  });
  if (existingSet) {
    throw new BadRequestError(
      'AssessmentAssignmentSet already exists for this assessment'
    );
  }

  // Retrieve the original TeamSet
  const teamSet = await TeamSetModel.findById(
    originalTeamSetId ?? assessment.teamSet?._id
  ).populate('teams');
  if (!teamSet) {
    throw new NotFoundError('Original TeamSet not found');
  }

  const originalTeams = teamSet.teams.map((team: any) => team._id);

  const assignedTeams: AssignedTeam[] | null =
    assessment.granularity === 'team'
      ? teamSet.teams.map((team: any) => ({
          team: team._id,
          tas: team.TA ? [team.TA] : [],
        }))
      : null;

  const assignedUsers: AssignedUser[] | null =
    assessment.granularity === 'individual'
      ? teamSet.teams.flatMap((team: any) =>
          team.members.map((user: any) => ({
            user: user._id,
            tas: team.TA ? [team.TA] : [],
          }))
        )
      : null;

  // After creation, if granularity is 'team', ensure every team has at least one TA
  if (assessment.granularity === 'team' && assignedTeams) {
    // Build a pool of TAs from teams that have assigned TAs
    const allTAs = assignedTeams.flatMap(at => at.tas as User[]);
    const uniqueTAIds = Array.from(new Set(allTAs.map(id => id.toString()))).map(
      idStr => new mongoose.Types.ObjectId(idStr)
    );

    // Assign a random TA from the pool to teams with no TAs
    ensureAtLeastOneTA(
      assignedTeams,
      uniqueTAIds
    );
  }

  // If granularity is 'individual', ensure every user has at least one TA
  if (assessment.granularity === 'individual' && assignedUsers) {
    const allTAIds = assignedUsers.flatMap(au => au.tas as User[]);
    const uniqueTAIds = Array.from(new Set(allTAIds.map(id => id.toString()))).map(
      idStr => new mongoose.Types.ObjectId(idStr)
    );

    ensureAtLeastOneTA(
      assignedUsers,
      uniqueTAIds
    );
  }

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
  const assignmentSet = await AssessmentAssignmentSetModel.findOne({
    assessment: assessmentId,
  })
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
 * Updates the assignedTeams or assignedUsers within an AssessmentAssignmentSet.
 * On update, ensures that every team/user is assigned at least 1 grader by throwing an error if any entity has zero TAs.
 * @param assessmentId - The ID of the assessment.
 * @param assignedTeams - The new array of AssignedTeam objects.
 * @param assignedUsers - The new array of AssignedUser objects.
 * @returns The updated AssessmentAssignmentSet document.
 */
export const updateAssignmentSet = async (
  assessmentId: string,
  assignedTeams?: AssignedTeam[],
  assignedUsers?: AssignedUser[]
): Promise<AssessmentAssignmentSet> => {
  let assignmentSet = await AssessmentAssignmentSetModel.findOne({
    assessment: assessmentId,
  });
  if (!assignmentSet) {
    await createAssignmentSet(assessmentId);
    assignmentSet = await AssessmentAssignmentSetModel.findOne({
      assessment: assessmentId,
    });
    if (!assignmentSet) {
      throw new NotFoundError('Invalid assignment id');
    }
  }

  if (assignedTeams) {
    for (const at of assignedTeams) {
      const team = await TeamModel.findById(at.team);
      if (!team) {
        throw new NotFoundError(`Team with ID ${at.team} not found`);
      }
      for (const taId of at.tas) {
        const ta = await UserModel.findById(taId);
        if (!ta) {
          throw new NotFoundError(`TA with ID ${taId} not found`);
        }
      }
    }

    // After validation, update assignedTeams field
    assignmentSet.assignedTeams = assignedTeams.map(at => ({
      team: at.team,
      tas: at.tas,
    }));

    // Ensure every team has at least one TA
    const anyTeamWithoutTA = assignmentSet.assignedTeams.some(at => at.tas.length === 0);
    if (anyTeamWithoutTA) {
      throw new BadRequestError('Each team must have at least one grader assigned.');
    }

    await assignmentSet.save();
  } else if (assignedUsers) {
    for (const au of assignedUsers) {
      const user = await UserModel.findById(au.user);
      if (!user) {
        throw new NotFoundError(`User with ID ${au.user} not found`);
      }
      for (const taId of au.tas) {
        const ta = await UserModel.findById(taId);
        if (!ta) {
          throw new NotFoundError(`TA with ID ${taId} not found`);
        }
      }
    }

    // After validation, update assignedUsers field
    assignmentSet.assignedUsers = assignedUsers.map(au => ({
      user: au.user,
      tas: au.tas,
    }));

    // Ensure every user has at least one TA
    const anyUserWithoutTA = assignmentSet.assignedUsers.some(au => au.tas.length === 0);
    if (anyUserWithoutTA) {
      throw new BadRequestError('Each user must have at least one grader assigned.');
    }

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
  const assignmentSet = await AssessmentAssignmentSetModel.findOne({
    assessment: assessmentId,
  })
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
    });
  if (!assignmentSet) {
    throw new NotFoundError('AssessmentAssignmentSet not found');
  }

  if (assignmentSet.assignedTeams) {
    // Filter teams where the TA is assigned
    const teamIds: mongoose.Types.ObjectId[] = assignmentSet.assignedTeams
      .filter(at => at.tas.length > 0)
      .map(at => at.team as mongoose.Types.ObjectId);

    const teams = await Promise.all(
      teamIds.map(async teamId => {
        return await TeamModel.findById(teamId).populate('members');
      })
    );
    return teams;
  } else {
    const userIds: mongoose.Types.ObjectId[] = assignmentSet
      .assignedUsers!.filter(at => at.tas.length > 0)
      .map(at => at.user as mongoose.Types.ObjectId);

    const users = await Promise.all(
      userIds.map(async userId => {
        return await UserModel.findById(userId);
      })
    );
    return users;
  }
};

/**
 * Retrieves all unmarked assignments to a specific TA within an assessment.
 * @param taId - The ID of the TA.
 * @param assessmentId - The ID of the assessment.
 * @returns An array of unmarked Teams OR Users. (Not AssignedTeams or AssignedUsers)
 */
export const getUnmarkedAssignmentsByTAId = async (
  taId: string,
  assessmentId: string
) => {
  const assignmentSet = await AssessmentAssignmentSetModel.findOne({
    assessment: assessmentId,
  })
    .populate({
      path: 'assignedTeams.tas',
      match: { _id: taId },
      select: 'name identifier',
    })
    .populate({
      path: 'assignedTeams.team',
    })
    .populate('assignedTeams.team.members')
    .populate({
      path: 'assignedUsers.tas',
      match: { _id: taId },
      select: 'name identifier',
    });
  if (!assignmentSet) {
    throw new NotFoundError('AssessmentAssignmentSet not found');
  }

  const submissions = await getSubmissionsByAssessmentAndUser(
    assessmentId,
    taId
  );

  const submittedUserIds = submissions.flatMap(
    sub =>
      (
        sub.answers
          .find(ans => ans.type === 'Team Member Selection Answer')!
          .toObject() as TeamMemberSelectionAnswer
      ).selectedUserIds
  );

  if (assignmentSet.assignedTeams) {
    // Filter teams where the TA is assigned but not marked
    const teamIds: mongoose.Types.ObjectId[] = assignmentSet.assignedTeams
      .filter(
        at =>
          at.tas.length > 0 &&
          submittedUserIds.every(
            uid =>
              !(at.team as Team).members!.find(
                member => member._id.toString() === uid
              )
          )
      )
      .map(at => at.team as mongoose.Types.ObjectId);

    const teams = await Promise.all(
      teamIds.map(async teamId => {
        return await TeamModel.findById(teamId).populate('members');
      })
    );
    return teams;
  } else {
    const userIds: mongoose.Types.ObjectId[] = assignmentSet
      .assignedUsers!.filter(
        as =>
          as.tas.length > 0 &&
          submittedUserIds.every(uid => uid !== as.user._id.toString())
      )
      .map(at => at.user as mongoose.Types.ObjectId);

    const users = await Promise.all(
      userIds.map(async userId => {
        return await UserModel.findById(userId);
      })
    );
    return users;
  }
};
