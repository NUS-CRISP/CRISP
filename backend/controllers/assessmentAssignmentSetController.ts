// controllers/assessmentAssignmentSetController.ts

import { Request, Response } from 'express';
import {
  createAssignmentSet,
  getAssignmentSetByAssessmentId,
  updateAssignmentSet,
  getAssignmentsByTAId,
} from '../services/assessmentAssignmentSetService';
import { BadRequestError, NotFoundError } from '../services/errors';
import { getAccountId } from 'utils/auth';
import { getUserIdByAccountId } from 'services/accountService';

/**
 * Controller to create a new AssessmentAssignmentSet.
 */
export const createAssignmentSetController = async (req: Request, res: Response) => {
  const { assessmentId } = req.params;
  const { originalTeamSetId } = req.body;

  // Validate input
  if (!originalTeamSetId) {
    return res.status(400).json({ error: 'originalTeamSetId is required' });
  }

  try {
    const assignmentSet = await createAssignmentSet(assessmentId, originalTeamSetId);
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
 * Controller to retrieve an AssessmentAssignmentSet by assessment ID.
 */
export const getAssignmentSetController = async (req: Request, res: Response) => {
  const { assessmentId } = req.params;

  try {
    const assignmentSet = await getAssignmentSetByAssessmentId(assessmentId);
    res.status(200).json(assignmentSet.assignedTeams);
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
 * Controller to update the assignedTeams within an AssessmentAssignmentSet.
 */
export const updateAssignmentSetController = async (req: Request, res: Response) => {
  const { assessmentId } = req.params;
  const { assignedTeams } = req.body;

  // Validate input
  if (!Array.isArray(assignedTeams)) {
    return res.status(400).json({ error: 'assignedTeams must be an array' });
  }

  try {
    const updatedSet = await updateAssignmentSet(assessmentId, assignedTeams);
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
 * Controller to retrieve all teams assigned to a specific TA within an assessment.
 */
export const getAssignmentsByTAIdController = async (req: Request, res: Response) => {
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
      console.error('Error fetching assignments by TA:', error);
      res.status(500).json({ error: 'Failed to fetch assignments by TA' });
    }
  }
};
