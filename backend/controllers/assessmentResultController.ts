/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import {
  getOrCreateAssessmentResults,
  recalculateResult,
  checkMarkingCompletion,
} from '../services/assessmentResultService';
import { BadRequestError, NotFoundError } from '../services/errors';
import { getAssignmentSetByAssessmentId } from '../services/assessmentAssignmentSetService';
import { getAccountId } from '../utils/auth';
import { getInternalAssessmentById } from '../services/internalAssessmentService';

/**
 * Controller to retrieve or create AssessmentResults for an assessment.
 * Route: GET /api/assessment-results/:assessmentId
 */
export const getOrCreateAssessmentResultsController = async (
  req: Request,
  res: Response
) => {
  const { assessmentId } = req.params;
  const accountId = await getAccountId(req);

  try {
    const assessment = await getInternalAssessmentById(assessmentId, accountId);
    if (!assessment) {
      throw new NotFoundError('Assessment not found');
    }

    const assignmentSet = await getAssignmentSetByAssessmentId(assessmentId);
    if (!assignmentSet) {
      throw new NotFoundError('Assignment Set not found for this assessment');
    }

    const assessmentResults = await getOrCreateAssessmentResults(assessmentId);
    if (!assessmentResults) {
      throw new NotFoundError(
        'Assessment Results not found for this assessment'
      );
    }

    const assessmentResultMap = new Map<string, any>();

    assessmentResults.forEach(result => {
      assessmentResultMap.set(result.student._id.toString(), result);
    });

    if (assessment.granularity === 'individual') {
      if (!assignmentSet.assignedUsers) {
        throw new BadRequestError(
          'Assessment is individual granularity, but assignments are for teams'
        );
      }
      for (const assignedUser of assignmentSet.assignedUsers) {
        const studentId = assignedUser.user._id.toString();
        let assessmentResult = assessmentResultMap.get(studentId);
        if (!assessmentResult) {
          assessmentResult = {
            _id: 'temp-' + studentId,
            assessment: assessmentId,
            student: assignedUser.user,
            marks: [],
          };
        }
        for (const marker of assignedUser.tas) {
          const existingMarkEntry = assessmentResult.marks.find(
            (markEntry: any) =>
              markEntry.marker._id.toString() === marker._id.toString()
          );
          if (!existingMarkEntry) {
            const tempMarkEntry = {
              marker: marker,
              submission: null,
              score: null,
            };
            assessmentResult.marks.push(tempMarkEntry);
          }
        }
        assessmentResultMap.set(studentId, assessmentResult);
      }
    } else if (assessment.granularity === 'team') {
      if (!assignmentSet.assignedTeams) {
        throw new BadRequestError(
          'Assessment is team granularity, but assignments are for users'
        );
      }
      for (const assignedTeam of assignmentSet.assignedTeams) {
        const teamId = assignedTeam.team._id.toString();
        let assessmentResult = assessmentResultMap.get('team-' + teamId);
        if (!assessmentResult) {
          assessmentResult = {
            _id: 'temp-team-' + teamId,
            assessment: assessmentId,
            team: assignedTeam.team,
            marks: [],
          };
        }
        for (const marker of assignedTeam.tas) {
          const existingMarkEntry = assessmentResult.marks.find(
            (markEntry: any) =>
              markEntry.marker._id.toString() === marker._id.toString()
          );
          if (!existingMarkEntry) {
            const tempMarkEntry = {
              marker: marker,
              submission: null,
              score: null,
            };
            assessmentResult.marks.push(tempMarkEntry);
          }
        }
        assessmentResultMap.set('team-' + teamId, assessmentResult);
      }
    }

    const updatedAssessmentResults = Array.from(assessmentResultMap.values());

    res.json({ data: updatedAssessmentResults });
  } catch (error) {
    if (error instanceof BadRequestError) {
      res.status(400).json({ error: error.message });
    } else if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error retrieving or creating AssessmentResults:', error);
      res
        .status(500)
        .json({ error: 'Failed to retrieve or create AssessmentResults' });
    }
  }
};

/**
 * Controller to recalculate the average score of an AssessmentResult.
 * Route: POST /api/assessment-results/:resultId/recalculate
 */
export const recalculateResultController = async (
  req: Request,
  res: Response
) => {
  const { resultId } = req.params;

  try {
    await recalculateResult(resultId);
    res.status(200).json({
      success: true,
      message: 'Average score recalculated successfully.',
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error recalculating AssessmentResult:', error);
      res.status(500).json({ error: 'Failed to recalculate AssessmentResult' });
    }
  }
};

/**
 * Controller to check marking completion for an assessment.
 * Route: GET /api/assessment-results/:assessmentId/check-marking-completion
 */
export const checkMarkingCompletionController = async (
  req: Request,
  res: Response
) => {
  const { assessmentId } = req.params;

  try {
    const unmarkedTeams = await checkMarkingCompletion(assessmentId);
    res.status(200).json({
      success: true,
      data: unmarkedTeams,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error checking marking completion:', error);
      res.status(500).json({ error: 'Failed to check marking completion' });
    }
  }
};
