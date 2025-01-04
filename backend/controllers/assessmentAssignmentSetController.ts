import { Request, Response } from 'express';
import {
  createAssignmentSet,
  getAssignmentSetByAssessmentId,
  updateAssignmentSet,
  getAssignmentsByTAId,
  getUnmarkedAssignmentsByTAId,
} from '../services/assessmentAssignmentSetService';
import { BadRequestError, NotFoundError } from '../services/errors';
import { getAccountId } from '../utils/auth';
import { getUserIdByAccountId } from '../services/accountService';

/**
 * Controller method to create a new AssessmentAssignmentSet.
 * Note: Typically, the assignment set is automatically created upon creation of an Assessment,
 * but this method can be used for manual creation if needed.
 *
 * @param {Request} req - The Express request object
 *  - req.params.assessmentId: The ID of the assessment for which an assignment set is being created.
 *  - req.body.originalTeamSetId: The ID of the original team set to be used in the creation process.
 * @param {Response} res - The Express response object
 *
 * @returns {Promise<void>}
 *  - 201 Created: Returns the newly created assignment set in JSON format.
 *  - 400 Bad Request: If input validation fails (e.g., missing/erroneous originalTeamSetId)
 *    or if an AssignmentSet already exists for the specified assessment.
 *  - 500 Internal Server Error: If any other error occurs during the creation process.
 *
 * @throws {BadRequestError} When the provided data is invalid or the AssignmentSet already exists.
 * @throws {NotFoundError} When the referenced assessment or team set cannot be found.
 * @throws {Error} For any unknown internal or server errors (500).
 */
export const createAssignmentSetController = async (
  req: Request,
  res: Response
) => {
  const { assessmentId } = req.params;
  const { originalTeamSetId } = req.body;

  if (!originalTeamSetId) {
    return res.status(400).json({ error: 'originalTeamSetId is required' });
  }

  try {
    const assignmentSet = await createAssignmentSet(
      assessmentId,
      originalTeamSetId
    );
    res.status(201).json(assignmentSet);
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof NotFoundError) {
      res.status(400).json({ error: error.message });
    } else {
      console.error('Error creating AssessmentAssignmentSet:', error);
      res
        .status(500)
        .json({ error: 'Failed to create AssessmentAssignmentSet' });
    }
  }
};

/**
 * Controller method to retrieve an AssessmentAssignmentSet by assessment ID.
 *
 * @param {Request} req - The Express request object
 *  - req.params.assessmentId: The ID of the assessment whose assignment set is to be retrieved.
 * @param {Response} res - The Express response object
 *
 * @description
 *  - Fetches the assignment set from the database using the provided assessmentId.
 *  - Returns either assignedTeams or assignedUsers, depending on which is present (depending on assessment granularity).
 *
 * @returns {Promise<void>}
 *  - 200 OK: Successfully fetched the assignment set (assignedTeams or assignedUsers).
 *  - 404 Not Found: If the assignment set does not exist or a NotFoundError is thrown.
 *  - 500 Internal Server Error: If any other error occurs while fetching.
 *
 * @throws {NotFoundError} When the assignment set is not found in the database.
 * @throws {Error} For any unknown internal or server errors (500).
 */
export const getAssignmentSetController = async (
  req: Request,
  res: Response
) => {
  const { assessmentId } = req.params;

  try {
    const assignmentSet = await getAssignmentSetByAssessmentId(assessmentId);
    res
      .status(200)
      .json(
        assignmentSet.assignedTeams === null
          ? assignmentSet.assignedUsers
          : assignmentSet.assignedTeams
      );
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error fetching AssessmentAssignmentSet:', error);
      res
        .status(500)
        .json({ error: 'Failed to fetch AssessmentAssignmentSet' });
    }
  }
};

/**
 * Controller method to update the assignments (teams or individuals) within an AssessmentAssignmentSet.
 *
 * @param {Request} req - The Express request object
 *  - req.params.assessmentId: The ID of the assessment whose assignment set is to be updated.
 *  - req.body.assignedTeams: (optional) Array of AssignedTeam for team-based granularity.
 *  - req.body.assignedUsers: (optional) Array of AssignedUser for individual-based granularity.
 *    Only one of assignedTeams or assignedUsers should be provided (not both or neither).
 * @param {Response} res - The Express response object
 *
 * @description
 *  - Updates the database record for the assignment set with new assignedTeams or assignedUsers.
 *  - If a team/student isn't assigned a grader, they might be randomly assigned one via the assessment's teamSet.
 *
 * @returns {Promise<void>}
 *  - 200 OK: Successfully updated and returns the updated assignment set.
 *  - 400 Bad Request: If there's a validation error or if both/neither assignedTeams and assignedUsers are provided.
 *  - 500 Internal Server Error: If any other error occurs while updating.
 *
 * @throws {NotFoundError} If the assignment set or related entities (teams/users/TAs) are not found.
 * @throws {BadRequestError} If the input data is invalid (both or none of assignedTeams/assignedUsers are provided).
 * @throws {Error} For any unknown internal or server errors (500).
 */
export const updateAssignmentSetController = async (
  req: Request,
  res: Response
) => {
  const { assessmentId } = req.params;
  const { assignedTeams, assignedUsers } = req.body;
  if (assignedTeams && assignedUsers) {
    res.status(400).json({ error: 'No mixed assignment types are allowed.' });
    return;
  }
  if (!assignedTeams && !assignedUsers) {
    res
      .status(400)
      .json({ error: 'No assignments given, assignments are required.' });
    return;
  }

  try {
    const updatedSet = await updateAssignmentSet(
      assessmentId,
      assignedTeams,
      assignedUsers
    );
    res.status(200).json(updatedSet);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof BadRequestError) {
      res.status(400).json({ error: error.message });
    } else {
      console.error('Error updating AssessmentAssignmentSet:', error);
      res
        .status(500)
        .json({ error: 'Failed to update AssessmentAssignmentSet' });
    }
  }
};

/**
 * Controller method to retrieve all teams assigned to a specific grader within an assessment.
 * Typically, the grader is a TA, but it could also be a faculty member.
 *
 * @param {Request} req - The Express request object
 *  - req.params.assessmentId: The ID of the assessment.
 *  - The grader's userId is derived from the request (via accountId and getUserIdByAccountId).
 * @param {Response} res - The Express response object
 *
 * @description
 *  - Determines the grader's userId from the request, then fetches assignments for that grader in the specified assessment.
 *
 * @returns {Promise<void>}
 *  - 200 OK: Successfully fetched the assigned teams or users.
 *  - 404 Not Found: If no assignments are found or a NotFoundError is thrown.
 *  - 500 Internal Server Error: For any unknown errors during fetching.
 *
 * @throws {NotFoundError} If no assignment set is found for the given assessment or grader.
 * @throws {Error} For any other unhandled runtime or server errors (500).
 */
export const getAssignmentsByGraderIdController = async (
  req: Request,
  res: Response
) => {
  const { assessmentId } = req.params;
  const accountId = await getAccountId(req);
  const userId = await getUserIdByAccountId(accountId);

  try {
    const assignments = await getAssignmentsByTAId(userId, assessmentId);
    res.status(200).json(assignments);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error fetching assignments by grader:', error);
      res.status(500).json({ error: 'Failed to fetch assignments by grader' });
    }
  }
};

/**
 * Controller method to retrieve all unmarked teams assigned to a specific grader within an assessment.
 * Graders are typically TAs, but can also be faculty members.
 *
 * @param {Request} req - The Express request object
 *  - req.params.assessmentId: The ID of the assessment.
 *  - The grader's userId is derived from the request (via accountId and getUserIdByAccountId).
 * @param {Response} res - The Express response object
 *
 * @description
 *  - Determines the grader's userId from the request, then fetches only unmarked assignments for that grader.
 *
 * @returns {Promise<void>}
 *  - 200 OK: Successfully fetched unmarked assignments.
 *  - 404 Not Found: If no unmarked assignments are found or a NotFoundError is thrown.
 *  - 500 Internal Server Error: For any unknown errors during fetching.
 *
 * @throws {NotFoundError} If no assignment set or unmarked assignments are found.
 * @throws {Error} For any other unhandled runtime or server errors (500).
 */
export const getUnmarkedAssignmentsByGraderIdController = async (
  req: Request,
  res: Response
) => {
  const { assessmentId } = req.params;
  const accountId = await getAccountId(req);
  const userId = await getUserIdByAccountId(accountId);

  try {
    const assignments = await getUnmarkedAssignmentsByTAId(
      userId,
      assessmentId
    );
    res.status(200).json(assignments);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error fetching assignments by grader:', error);
      res.status(500).json({ error: 'Failed to fetch assignments by grader' });
    }
  }
};
