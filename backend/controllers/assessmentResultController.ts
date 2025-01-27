/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import {
  getOrCreateAssessmentResults,
  recalculateResult,
} from '../services/assessmentResultService';
import { BadRequestError, NotFoundError } from '../services/errors';
import { getAssignmentSetByAssessmentId } from '../services/assessmentAssignmentSetService';
import { getAccountId } from '../utils/auth';
import { getInternalAssessmentById } from '../services/internalAssessmentService';
import TeamModel from '@models/Team';

/**
 * Controller to retrieve or create AssessmentResults for a given assessment.
 *
 * @param {Request} req - The Express request object
 *  - req.params.assessmentId: The ID of the assessment for which results are fetched or created.
 * @param {Response} res - The Express response object
 *
 * @returns {Promise<void>}
 *  - 200 OK: Returns an object containing an array of updated or created AssessmentResults.
 *  - 400 Bad Request: If the assessment granularity is mismatched or no students are found.
 *  - 404 Not Found: If the assessment or assignment set is not found.
 *  - 500 Internal Server Error: For any other errors during processing.
 *
 * @throws {NotFoundError} If the assessment or assignment set cannot be found.
 * @throws {BadRequestError} If data validation fails (e.g., no students assigned).
 * @throws {Error} For any unknown internal or server errors (500).
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
        'Assessment results not found for this assessment'
      );
    }

    const assessmentResultMap = new Map<string, any>();

    // Build a map of existing results keyed by studentId
    assessmentResults.forEach(result => {
      assessmentResultMap.set(result.student._id.toString(), result);
    });

    // Depending on granularity, ensure that marks exist for each assigned user or team member
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

        // Ensure each TA has an entry in marks
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
        const team = await TeamModel.findById(teamId).populate('members');
        if (!team || !team.members || team.members.length === 0) {
          continue;
        }
        team.members.forEach(member => {
          const studentId = member._id.toString();
          let assessmentResult = assessmentResultMap.get(studentId);
          if (!assessmentResult) {
            assessmentResult = {
              _id: 'temp-team-' + studentId,
              assessment: assessmentId,
              student: member,
              marks: [],
            };
          }

          // Ensure each TA has an entry in marks
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
          assessmentResultMap.set(studentId, assessmentResult);
        });
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
 *
 * @param {Request} req - The Express request object
 *  - req.params.resultId: The ID of the AssessmentResult to recalculate.
 * @param {Response} res - The Express response object
 *
 * @returns {Promise<void>}
 *  - 200 OK: Indicates that the average score was recalculated successfully.
 *  - 404 Not Found: If the specified result is not found.
 *  - 500 Internal Server Error: For any unknown errors during recalculation.
 *
 * @throws {NotFoundError} If the AssessmentResult is not found.
 * @throws {Error} For any other unhandled runtime or server errors (500).
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
