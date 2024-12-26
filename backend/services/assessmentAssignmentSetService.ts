/* eslint-disable @typescript-eslint/no-explicit-any */
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
 * Utility function: Assign a random TA from a given pool to a team or user without TAs.
 *
 * @param {AssignedTeam[] | AssignedUser[]} entities - The array of AssignedTeam or AssignedUser entities.
 * @param {mongoose.Types.ObjectId[]} pool - An array of TA (User) IDs available for assignment.
 *
 * @description
 *  - Iterates through each team/user entity, checking if they have zero TAs assigned.
 *  - If so, it assigns a random TA ID from the given pool.
 *
 * @returns {void} - Does not return anything; directly mutates the passed entities array.
 *
 * Exit points:
 *  - None (other than possible unexpected runtime errors). No explicit error throwing in this function.
 */
function ensureAtLeastOneTA(
  entities: (AssignedTeam | AssignedUser)[],
  pool: mongoose.Types.ObjectId[]
) {
  for (const entity of entities) {
    if (entity.tas.length === 0 && pool.length > 0) {
      const randomTaId = pool[Math.floor(Math.random() * pool.length)];
      entity.tas = [randomTaId];
    }
  }
}

/**
 * Creates a new AssessmentAssignmentSet based on the provided assessment and original TeamSet.
 *
 * @param {string} assessmentId - The ID of the assessment.
 * @param {string} [originalTeamSetId] - Optional ID of the original TeamSet from which to create assignments.
 *
 * @description
 *  - If an AssessmentAssignmentSet already exists, throws a BadRequestError.
 *  - Pulls data from TeamSet, populates assignedTeams or assignedUsers based on the assessment’s granularity.
 *  - Ensures that every team/user has at least one TA assigned.
 *  - Links the newly created assignment set to the InternalAssessment.
 *
 * @returns {Promise<AssessmentAssignmentSet>} - Returns the newly created AssessmentAssignmentSet document.
 *  - NotFoundError: If the assessment or the specified TeamSet cannot be found.
 *  - BadRequestError: If an assignment set already exists for the assessment.
 *  - 500 error (uncaught): Any other unhandled error from mongoose or runtime exceptions.
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

  if (assessment.granularity === 'team' && assignedTeams) {
    const allTAs = assignedTeams.flatMap(at => at.tas as User[]);
    const uniqueTAIds = Array.from(
      new Set(allTAs.map(id => id.toString()))
    ).map(
      idStr => new mongoose.Types.ObjectId(idStr)
    );

    ensureAtLeastOneTA(assignedTeams, uniqueTAIds);
  }

  if (assessment.granularity === 'individual' && assignedUsers) {
    const allTAIds = assignedUsers.flatMap(au => au.tas as User[]);
    const uniqueTAIds = Array.from(
      new Set(allTAIds.map(id => id.toString()))
    ).map(
      idStr => new mongoose.Types.ObjectId(idStr)
    );

    ensureAtLeastOneTA(assignedUsers, uniqueTAIds);
  }

  const assignmentSet = new AssessmentAssignmentSetModel({
    assessment: assessmentId,
    originalTeams,
    assignedTeams,
    assignedUsers,
  });

  await assignmentSet.save();

  assessment.assessmentAssignmentSet = assignmentSet._id;
  await assessment.save();

  return assignmentSet;
};

/**
 * Retrieves the AssessmentAssignmentSet for a specific assessment.
 *
 * @param {string} assessmentId - The ID of the assessment.
 *
 * @description
 *  - Populates referenced fields such as originalTeams, assignedTeams, assignedUsers,
 *    and their related members or TAs for better clarity on the stored data.
 *
 * @returns {Promise<AssessmentAssignmentSet>} - Returns the fully populated AssessmentAssignmentSet document.
 *  - NotFoundError: If the assignment set is not found.
 *  - 500 error (uncaught): Any other unhandled error from mongoose or runtime exceptions.
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
 *
 * @param {string} assessmentId - The ID of the assessment whose assignment set is being updated.
 * @param {AssignedTeam[]} [assignedTeams] - The new array of AssignedTeam objects (if in 'team' granularity).
 * @param {AssignedUser[]} [assignedUsers] - The new array of AssignedUser objects (if in 'individual' granularity).
 *
 * @description
 *  - Ensures each provided team/user exists, as do their TAs. Throws NotFoundError if any entity is invalid.
 *  - Ensures that each team/user has at least one TA assigned, otherwise throws BadRequestError.
 *  - Saves the updated assignment set to the database.
 *
 * @returns {Promise<AssessmentAssignmentSet>} - Returns the updated AssessmentAssignmentSet document.
 *  - NotFoundError: If the assignment set doesn’t exist, or if a referenced team/user/TA doesn’t exist.
 *  - BadRequestError: If any team/user is left without a TA.
 *  - 500 error (uncaught): Any other unhandled error from mongoose or runtime exceptions.
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
    // If there's no existing set, try to create a new one, then retrieve it.
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

    assignmentSet.assignedTeams = assignedTeams.map(at => ({
      team: at.team,
      tas: at.tas,
    }));

    const anyTeamWithoutTA = assignmentSet.assignedTeams.some(
      at => at.tas.length === 0
    );
    if (anyTeamWithoutTA) {
      throw new BadRequestError(
        'Each team must have at least one grader assigned.'
      );
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

    assignmentSet.assignedUsers = assignedUsers.map(au => ({
      user: au.user,
      tas: au.tas,
    }));

    const anyUserWithoutTA = assignmentSet.assignedUsers.some(
      au => au.tas.length === 0
    );
    if (anyUserWithoutTA) {
      throw new BadRequestError(
        'Each user must have at least one grader assigned.'
      );
    }

    await assignmentSet.save();
  }

  return assignmentSet;
};

/**
 * Retrieves all assigned entities to a specific TA within an assessment.
 *
 * @param {string} taId - The ID of the TA (grader).
 * @param {string} assessmentId - The ID of the assessment.
 *
 * @description
 *  - Looks up the existing assignment set for the assessment, filtering assignedTeams or assignedUsers
 *    by whether the TA matches the provided taId.
 *  - Returns the actual Team or User documents, not just references or the assignedTeams/Users doucments.
 *
 * @returns {Promise<Team[] | User[]>} - Returns an array of Teams or Users (depending on granularity).
 *  - NotFoundError: If the assignment set is not found.
 *  - 500 error (uncaught): Any other unhandled error from mongoose or runtime exceptions.
 */
export const getAssignmentsByTAId = async (
  taId: string,
  assessmentId: string
): Promise<Team[] | User[]> => {
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

  // If assignedTeams exist, we're dealing with 'team' granularity
  if (assignmentSet.assignedTeams) {
    const teamIds: mongoose.Types.ObjectId[] = assignmentSet.assignedTeams
      .filter(at => at.tas.length > 0)
      .map(at => at.team as mongoose.Types.ObjectId);

    const teams = await Promise.all(
      teamIds.map(async teamId => {
        return TeamModel.findById(teamId).populate('members'); //TODO: Removed await here, may cause bugs?
      })
    );
    return teams.filter(Boolean) as Team[];
  } else {
    // Otherwise, we have assignedUsers
    const userIds: mongoose.Types.ObjectId[] = assignmentSet.assignedUsers!
      .filter(au => au.tas.length > 0)
      .map(au => au.user as mongoose.Types.ObjectId);

    const users = await Promise.all(
      userIds.map(async userId => {
        return UserModel.findById(userId);
      })
    );
    return users.filter(Boolean) as User[];
  }
};

/**
 * Retrieves all unmarked assignments to a specific TA within an assessment.
 *
 * @param {string} taId - The ID of the TA (grader).
 * @param {string} assessmentId - The ID of the assessment.
 *
 * @description
 *  - Looks up the assignment set for the assessment and the TA’s submissions.
 *  - Checks which teams/users have not been marked yet, determined by comparing with user IDs in submission answers.
 *  - Returns the unmarked Teams or Users accordingly.
 *
 * @returns {Promise<Team[] | User[]>} - An array of Teams or Users that have not been marked yet.
 *  - NotFoundError: If the assignment set is not found.
 *  - 500 error (uncaught): Any other unhandled error from mongoose or runtime exceptions.
 */
export const getUnmarkedAssignmentsByTAId = async (
  taId: string,
  assessmentId: string
): Promise<Team[] | User[]> => {
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

  const submissions = await getSubmissionsByAssessmentAndUser(assessmentId, taId);

  const submittedUserIds = submissions.flatMap(sub => {
    const answer = sub.answers.find(ans => ans.type === 'Team Member Selection Answer');
    return (answer?.toObject() as TeamMemberSelectionAnswer).selectedUserIds;
  });

  if (assignmentSet.assignedTeams) {
    const teamIds: mongoose.Types.ObjectId[] = assignmentSet.assignedTeams
      .filter(
        at =>
          at.tas.length > 0 &&
          submittedUserIds.every(
            uid =>
              !(at.team as Team).members?.find(member => member._id.toString() === uid)
          )
      )
      .map(at => at.team as mongoose.Types.ObjectId);

    const teams = await Promise.all(
      teamIds.map(async teamId => {
        return TeamModel.findById(teamId).populate('members');
      })
    );
    return teams.filter(Boolean) as Team[];
  } else {
    const userIds: mongoose.Types.ObjectId[] = assignmentSet.assignedUsers!
      .filter(
        au =>
          au.tas.length > 0 &&
          submittedUserIds.every(uid => uid !== au.user._id.toString())
      )
      .map(au => au.user as mongoose.Types.ObjectId);

    const users = await Promise.all(
      userIds.map(async userId => {
        return UserModel.findById(userId);
      })
    );
    return users.filter(Boolean) as User[];
  }
};
