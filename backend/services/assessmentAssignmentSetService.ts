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
import { getInternalAssessmentById } from './internalAssessmentService';
import AccountModel from '@models/Account';
import CourseRole from '@shared/types/auth/CourseRole';

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
 * @returns {void} - Directly mutates the passed entities array (no return).
 *
 * @throws No explicit errors are thrown in this function. (Runtime errors may occur in extreme cases)
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
 * @returns {Promise<AssessmentAssignmentSet>} - The newly created AssessmentAssignmentSet document.
 *
 * @throws {NotFoundError} If the assessment or the specified TeamSet cannot be found.
 * @throws {BadRequestError} If an assignment set already exists for the assessment.
 * @throws {Error} For any unknown runtime or Mongoose errors (500).
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
    ).map(idStr => new mongoose.Types.ObjectId(idStr));

    ensureAtLeastOneTA(assignedTeams, uniqueTAIds);
  }

  if (assessment.granularity === 'individual' && assignedUsers) {
    const allTAIds = assignedUsers.flatMap(au => au.tas as User[]);
    const uniqueTAIds = Array.from(
      new Set(allTAIds.map(id => id.toString()))
    ).map(idStr => new mongoose.Types.ObjectId(idStr));

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
 * @returns {Promise<AssessmentAssignmentSet>} - The fully populated AssessmentAssignmentSet document.
 *
 * @throws {NotFoundError} If the assignment set is not found.
 * @throws {Error} For any unknown runtime or Mongoose errors (500).
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
 * @param {AssignedTeam[]} [assignedTeams] - The new array of AssignedTeam objects (if 'team' granularity).
 * @param {AssignedUser[]} [assignedUsers] - The new array of AssignedUser objects (if 'individual' granularity).
 *
 * @description
 *  - Ensures each provided team/user exists, as do their TAs (throws NotFoundError if any entity is invalid).
 *  - Ensures that each team/user has at least one TA assigned (throws BadRequestError otherwise).
 *  - Saves the updated assignment set to the database.
 *
 * @returns {Promise<AssessmentAssignmentSet>} - The updated AssessmentAssignmentSet document.
 *
 * @throws {NotFoundError} If the assignment set doesn’t exist, or if a referenced team/user/TA doesn’t exist.
 * @throws {BadRequestError} If any team/user is left without a TA.
 * @throws {Error} For any unknown runtime or Mongoose errors (500).
 */
export const updateAssignmentSet = async (
  accountId: string,
  assessmentId: string,
  assignedTeams?: AssignedTeam[],
  assignedUsers?: AssignedUser[]
): Promise<AssessmentAssignmentSet> => {
  let assignmentSet = await AssessmentAssignmentSetModel.findOne({
    assessment: assessmentId,
  });
  if (!assignmentSet) {
    // If there's no existing set, create a new one, then retrieve it
    await createAssignmentSet(assessmentId);
    assignmentSet = await AssessmentAssignmentSetModel.findOne({
      assessment: assessmentId,
    });
    if (!assignmentSet) {
      throw new NotFoundError('Invalid assignment id');
    }
  }

  const assessment = await getInternalAssessmentById(assessmentId, accountId);
  if (!assessment || assessment.isReleased) {
    throw new BadRequestError(
      'Cannot edit assignments of a released assessment!'
    );
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
 * Retrieves all assigned entities (teams or users) for a specific TA within an assessment.
 *
 * @param {string} taId - The ID of the TA (grader).
 * @param {string} assessmentId - The ID of the assessment.
 *
 * @description
 *  - Finds the existing assignment set for the given assessment.
 *  - If 'team' granularity, filters assignedTeams for those that include the TA. Otherwise, checks assignedUsers.
 *  - Returns the actual Team or User documents, not the assignment references.
 *
 * @returns {Promise<Team[] | User[]>} - An array of Teams or Users (depending on granularity).
 *
 * @throws {NotFoundError} If the assignment set is not found.
 * @throws {Error} For any unknown runtime or Mongoose errors (500).
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

  // If assignedTeams exist, the granularity is 'team'
  if (assignmentSet.assignedTeams) {
    const teamIds: mongoose.Types.ObjectId[] = assignmentSet.assignedTeams
      .filter(at => at.tas.length > 0)
      .map(at => at.team as mongoose.Types.ObjectId);

    const teams = await Promise.all(
      teamIds.map(async teamId => {
        // NOTE: This lacks `await` in the original code, could cause concurrency issues, but left unchanged
        return TeamModel.findById(teamId).populate('members');
      })
    );
    return teams.filter(Boolean) as Team[];
  } else {
    // Otherwise, assignedUsers
    const userIds: mongoose.Types.ObjectId[] = assignmentSet
      .assignedUsers!.filter(au => au.tas.length > 0)
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
 * Retrieves all unmarked assignments for a specific TA within an assessment.
 *
 * @param {string} taId - The ID of the TA (grader).
 * @param {string} assessmentId - The ID of the assessment.
 *
 * @description
 *  - Finds the assignment set for the assessment, then fetches the TA’s submissions.
 *  - Compares submission data against assignedTeams or assignedUsers to see which are unmarked.
 *
 * @returns {Promise<Team[] | User[]>} - An array of Teams or Users that remain unmarked for this TA.
 *
 * @throws {NotFoundError} If the assignment set is not found.
 * @throws {Error} For any unknown runtime or Mongoose errors (500).
 */
export const getUnmarkedAssignmentsByTAId = async (
  taId: string,
  assessmentId: string
): Promise<Team[] | User[]> => {
  const account = await AccountModel.findOne({
    user: taId,
  });
  if (!account) throw new NotFoundError('TA account not found');
  const assessment = await InternalAssessmentModel.findById(assessmentId);
  if (!assessment) throw new NotFoundError('Assessment not found');
  if (
    account.courseRoles.filter(
      r => r[0] === assessment.course.toString()
    )[0][1] === CourseRole.Student
  ) {
    return []; // For the sake of notifications, this returns an empty array.
  }
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

  // Extract user IDs from all submissions related to Team Member Selection Answer
  const submittedUserIds = submissions.flatMap(sub => {
    const answer = sub.answers.find(
      ans => ans.type === 'Team Member Selection Answer'
    );
    return (answer?.toObject() as TeamMemberSelectionAnswer).selectedUserIds;
  });

  if (assignmentSet.assignedTeams) {
    const teamIds: mongoose.Types.ObjectId[] = assignmentSet.assignedTeams
      .filter(
        at =>
          at.tas.length > 0 &&
          submittedUserIds.every(
            uid =>
              !(at.team as Team).members?.find(
                member => member._id.toString() === uid
              )
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
    const userIds: mongoose.Types.ObjectId[] = assignmentSet
      .assignedUsers!.filter(
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
