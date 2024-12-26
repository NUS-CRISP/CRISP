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
 * Controller method to create a new AssessmentAssignmentSet. Not being used right now due to
 * the creation of AssignmentSet being automatic upon creation of an Assessment,
 * but may be useful in future if a manual process for AssignmentSet is desired.
 *
 * @param {Request} req - The Express request object.
 *  - req.params.assessmentId: The ID of the assessment for which an assignment set is being created.
 *  - req.body.originalTeamSetId: The ID of the original team set to be used in the creation process.
 * @param {Response} res - The Express response object used to send back the response.
 *
 * @returns {Promise<void>}
 *  - 201 Created: Returns the newly created assignment set in JSON format.
 *  - 400 Bad Request: If input validation fails (e.g., missing/erroneous originalTeamSetId)
 *    or if an AssignmentSet already exists for the assessment indicated by `assessmentId`.
 *  - 500 Internal Server Error: If any other error occurs during the creation process.
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
      res.status(500).json({ error: 'Failed to create AssessmentAssignmentSet' });
    }
  }
};

/**
 * Controller method to retrieve an AssessmentAssignmentSet by assessment ID.
 *
 * @param {Request} req - The Express request object.
 *  - req.params.assessmentId: The ID of the assessment whose assignment set is to be retrieved.
 * @param {Response} res - The Express response object used to send back the response.
 *
 * @description
 *  - Fetches the assignment set from the database using the provided assessmentId.
 *  - Returns either the assignedTeams or assignedUsers, depending on which is present (dependant on
 *    assessment's granularity).
 *
 * @returns {Promise<void>}
 *  - 200 OK: Successfully fetched and returns the assignment set (assignedTeams or assignedUsers).
 *  - 404 Not Found: If the assignment set does not exist or a NotFoundError is thrown.
 *  - 500 Internal Server Error: If any other error occurs while fetching.
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
      res.status(500).json({ error: 'Failed to fetch AssessmentAssignmentSet' });
    }
  }
};

/**
 * Controller method to update the assignments between teaching staff and teams/students
 * within an AssessmentAssignmentSet.
 *
 * @param {Request} req - The Express request object.
 *  - req.params.assessmentId: The ID of the assessment whose assignment set is to be updated.
 *  - req.body.assignedTeams: (optional) An array or object representing updated team assignments.
 *  - req.body.assignedUsers: (optional) An array or object representing updated user assignments.
 *  (Note: It is required that only one of either assignedTeams or assignedUsers is present.
 *  If a team/student isn't assigned a grader, they will be randomly assigned one via the
 *  assessment's teamSet)
 * @param {Response} res - The Express response object used to send back the response.
 *
 * @description
 *  - Updates the assignment set record in the database with the new assignedTeams or assignedUsers.
 *
 * @returns {Promise<void>}
 *  - 200 OK: Successfully updated and returns the updated assignment set.
 *  - 400 Bad Request: If there's a validation error or if a BadRequestError/NotFoundError is thrown.
 *  Also thrown if both or neither assignedTeams and assignedUsers are provided.
 *  - 500 Internal Server Error: If any other error occurs while updating.
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
    res.status(400).json({ error: 'No assignments given, assignments are required.' });
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
      res.status(500).json({ error: 'Failed to update AssessmentAssignmentSet' });
    }
  }
};

/**
 * Controller method to retrieve all teams assigned to a specific grader within an assessment.
 * In general, graders refer to TAs but can also be faculty members.
 *
 * @param {Request} req - The Express request object.
 *  - req.params.assessmentId: The ID of the assessment.
 *  - req object used to derive the grader's userId (via accountId and getUserIdByAccountId).
 * @param {Response} res - The Express response object used to send back the response.
 *
 * @description
 *  - Determines the grader's userId from the request, then fetches assignments for that grader
 *    in the specified assessment.
 *
 * @returns {Promise<void>}
 *  - 200 OK: Successfully fetched assignments.
 *  - 404 Not Found: If no assignments are found or a NotFoundError is thrown.
 *  - 500 Internal Server Error: If any other error occurs while fetching.
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
 * In general, graders refer to TAs but can also be faculty members.
 *
 * @param {Request} req - The Express request object.
 *  - req.params.assessmentId: The ID of the assessment.
 *  - req object used to derive the grader's userId (via accountId and getUserIdByAccountId).
 * @param {Response} res - The Express response object used to send back the response.
 *
 * @description
 *  - Determines the grader's userId from the request, then fetches only the unmarked assignments
 *    for that grader in the specified assessment.
 *
 * @returns {Promise<void>}
 *  - 200 OK: Successfully fetched unmarked assignments.
 *  - 404 Not Found: If no unmarked assignments are found or a NotFoundError is thrown.
 *  - 500 Internal Server Error: If any other error occurs while fetching.
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
      console.error('Error fetching assignments by TA:', error);
      res.status(500).json({ error: 'Failed to fetch assignments by TA' });
    }
  }
};
