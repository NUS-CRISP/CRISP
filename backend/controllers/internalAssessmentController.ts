import { Request, Response } from 'express';
import {
  BadRequestError,
  NotFoundError,
  MissingAuthorizationError,
} from '../services/errors';
import { getAccountId } from '../utils/auth';
import {
  getInternalAssessmentById,
  updateInternalAssessmentById,
  deleteInternalAssessmentById,
  addQuestionToAssessment,
  deleteQuestionById,
  getQuestionsByAssessmentId,
  updateQuestionById,
  releaseInternalAssessmentById,
  recallInternalAssessmentById,
} from '../services/internalAssessmentService';

/**
 * Controller method to get an internal assessment by its ID.
 *
 * @param {Request} req - The Express request object
 *  - req.params.assessmentId: The ID of the assessment to retrieve.
 * @param {Response} res - The Express response object
 *
 * @returns {Promise<void>}
 *  - 200 OK: Returns the assessment in JSON format.
 *  - 404 Not Found: If the assessment or account is not found.
 *  - 400 Bad Request: If authorization is missing.
 *  - 500 Internal Server Error: For any other unknown errors.
 */
export const getInternalAssessment = async (req: Request, res: Response) => {
  try {
    const accountId = await getAccountId(req);
    const { assessmentId } = req.params;
    const assessment = await getInternalAssessmentById(assessmentId, accountId);
    res.status(200).json(assessment);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof MissingAuthorizationError) {
      res.status(400).json({ error: 'Missing authorization' });
    } else {
      console.error('Error retrieving assessment:', error);
      res.status(500).json({ error: 'Failed to retrieve assessment' });
    }
  }
};

/**
 * Controller method to update an internal assessment by its ID.
 *
 * @param {Request} req - The Express request object
 *  - req.params.assessmentId: The ID of the assessment to update.
 *  - req.body: The fields to update in the assessment.
 * @param {Response} res - The Express response object
 *
 * @returns {Promise<void>}
 *  - 200 OK: If the assessment is updated successfully.
 *  - 404 Not Found: If the assessment or account is not found.
 *  - 400 Bad Request: If the user does not have permissions or there is a validation error.
 *  - 500 Internal Server Error: For any other unknown errors.
 */
export const updateInternalAssessment = async (req: Request, res: Response) => {
  const { assessmentId } = req.params;
  const updateData = req.body;
  try {
    const accountId = await getAccountId(req);
    await updateInternalAssessmentById(assessmentId, accountId, updateData);
    res.status(200).json({ message: 'Assessment updated successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof BadRequestError) {
      res.status(400).json({ error: error.message });
    } else {
      console.error('Error updating assessment:', error);
      res.status(500).json({ error: 'Failed to update assessment' });
    }
  }
};

/**
 * Controller method to delete an internal assessment by its ID.
 *
 * @param {Request} req - The Express request object
 *  - req.params.assessmentId: The ID of the assessment to delete.
 * @param {Response} res - The Express response object
 *
 * @returns {Promise<void>}
 *  - 200 OK: If the assessment is deleted successfully.
 *  - 404 Not Found: If the assessment is not found.
 *  - 500 Internal Server Error: For any unknown errors during deletion.
 */
export const deleteInternalAssessment = async (req: Request, res: Response) => {
  const { assessmentId } = req.params;
  try {
    await deleteInternalAssessmentById(assessmentId);
    res.status(200).json({ message: 'Assessment deleted successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error deleting assessment:', error);
      res.status(500).json({ error: 'Failed to delete assessment' });
    }
  }
};

/*-------------------------- Questions ---------------------------------------------*/

/**
 * Controller method to add a single question to an assessment.
 * Used for GUI adding of questions.
 *
 * @param {Request} req - The Express request object
 *  - req.params.assessmentId: The ID of the assessment.
 *  - req.body: The question data to add (type, text, etc.).
 * @param {Response} res - The Express response object
 *
 * @returns {Promise<void>}
 *  - 201 Created: If the question is added successfully.
 *  - 404 Not Found: If the assessment or logged in account is not found.
 *  - 400 Bad Request: If the question data is invalid or user is unauthorized.
 *  - 401 Unauthorized: If authorization is missing.
 *  - 500 Internal Server Error: For any unknown errors during creation.
 */
export const addQuestionToAssessmentController = async (
  req: Request,
  res: Response
) => {
  try {
    const accountId = await getAccountId(req);
    const { assessmentId } = req.params;
    const questionData = req.body;

    const question = await addQuestionToAssessment(
      assessmentId,
      questionData,
      accountId
    );

    res.status(201).json(question);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof BadRequestError) {
      res.status(400).json({ error: error.message });
    } else if (error instanceof MissingAuthorizationError) {
      res.status(401).json({ error: 'Missing authorization' });
    } else {
      console.error('Error adding question:', error);
      res.status(500).json({ error: 'Failed to add question' });
    }
  }
};

/**
 * Controller method to add multiple questions to an assessment in one request.
 * Used for CSV uploading of questions.
 *
 * @param {Request} req - The Express request object
 *  - req.params.assessmentId: The ID of the assessment.
 *  - req.body.items: An array of question data objects.
 * @param {Response} res - The Express response object
 *
 * @returns {Promise<void>}
 *  - 201 Created: If all questions are added successfully.
 *  - 404 Not Found: If the assessment or account is not found.
 *  - 400 Bad Request: If the questions' data are invalid or user is unauthorized.
 *  - 401 Unauthorized: If authorization is missing.
 *  - 500 Internal Server Error: For any unknown errors during creation.
 */
export const addQuestionsToAssessmentController = async (
  req: Request,
  res: Response
) => {
  try {
    const accountId = await getAccountId(req);
    const { assessmentId } = req.params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const questionDatas: any[] = req.body.items;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const questions: any[] = [];

    questionDatas.forEach(async (questionData) => {
      questions.push(
        await addQuestionToAssessment(assessmentId, questionData, accountId)
      );
    });

    res.status(201).json(questions);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof BadRequestError) {
      res.status(400).json({ error: error.message });
    } else if (error instanceof MissingAuthorizationError) {
      res.status(401).json({ error: 'Missing authorization' });
    } else {
      console.error('Error adding question:', error);
      res.status(500).json({ error: 'Failed to add question' });
    }
  }
};

/**
 * Controller method to get all questions from a particular assessment.
 *
 * @param {Request} req - The Express request object
 *  - req.params.assessmentId: The ID of the assessment.
 * @param {Response} res - The Express response object
 *
 * @returns {Promise<void>}
 *  - 200 OK: Returns an array of question objects.
 *  - 404 Not Found: If the assessment or account is not found.
 *  - 401 Unauthorized: If authorization is missing.
 *  - 500 Internal Server Error: For any unknown errors.
 */
export const getQuestionsByAssessmentIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const accountId = await getAccountId(req);
    const { assessmentId } = req.params;

    const questions = await getQuestionsByAssessmentId(assessmentId, accountId);

    res.status(200).json(questions);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof MissingAuthorizationError) {
      res.status(401).json({ error: 'Missing authorization' });
    } else {
      console.error('Error retrieving questions:', error);
      res.status(500).json({ error: 'Failed to retrieve questions' });
    }
  }
};

/**
 * Controller method to update a question by its ID.
 *
 * @param {Request} req - The Express request object
 *  - req.params.questionId: The ID of the question to update.
 *  - req.body: The fields to update in the question.
 * @param {Response} res - The Express response object
 *
 * @returns {Promise<void>}
 *  - 200 OK: Returns the updated question.
 *  - 404 Not Found: If the question or account is not found.
 *  - 400 Bad Request: If the user is unauthorized or if updates are invalid (e.g., locked question).
 *  - 401 Unauthorized: If authorization is missing.
 *  - 500 Internal Server Error: For any other unknown errors.
 */
export const updateQuestionByIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const accountId = await getAccountId(req);
    const { questionId } = req.params;
    const updateData = req.body;

    const updatedQuestion = await updateQuestionById(
      questionId,
      updateData,
      accountId
    );

    res.status(200).json(updatedQuestion);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof BadRequestError) {
      res.status(400).json({ error: error.message });
    } else if (error instanceof MissingAuthorizationError) {
      res.status(401).json({ error: 'Missing authorization' });
    } else {
      console.error('Error updating question:', error);
      res.status(500).json({ error: 'Failed to update question' });
    }
  }
};

/**
 * Controller method to delete a question by its ID from an assessment.
 *
 * @param {Request} req - The Express request object
 *  - req.params.assessmentId: The ID of the assessment.
 *  - req.params.questionId: The ID of the question to delete.
 * @param {Response} res - The Express response object
 *
 * @returns {Promise<void>}
 *  - 204 No Content: If the question is successfully deleted.
 *  - 404 Not Found: If the assessment or question is not found.
 *  - 400 Bad Request: If the question is locked or the user is unauthorized.
 *  - 401 Unauthorized: If authorization is missing.
 *  - 500 Internal Server Error: For any unknown errors.
 */
export const deleteQuestionByIdController = async (
  req: Request,
  res: Response
) => {
  try {
    const accountId = await getAccountId(req);
    const { assessmentId, questionId } = req.params;

    await deleteQuestionById(assessmentId, questionId, accountId);

    res.status(204).send();
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof BadRequestError) {
      res.status(400).json({ error: error.message });
    } else if (error instanceof MissingAuthorizationError) {
      res.status(401).json({ error: 'Missing authorization' });
    } else {
      console.error('Error deleting question:', error);
      res.status(500).json({ error: 'Failed to delete question' });
    }
  }
};

/*---------------------------- Release-Form --------------------------*/

/**
 * Controller method to release an internal assessment for students to view/take.
 * Sets an assessment's "isReleased" flag to true, making it visible/available to students.
 *
 * @param {Request} req - The Express request object
 *  - req.params.assessmentId: The ID of the assessment to release.
 * @param {Response} res - The Express response object
 *
 * @returns {Promise<void>}
 *  - 200 OK: If the assessment is successfully released.
 *  - 404 Not Found: If the assessment or account is not found.
 *  - 400 Bad Request: If the user is unauthorized to release assessments.
 *  - 401 Unauthorized: If authorization is missing.
 *  - 500 Internal Server Error: For any unknown errors.
 */
export const releaseInternalAssessment = async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const accountId = await getAccountId(req);

    await releaseInternalAssessmentById(assessmentId, accountId);

    res.status(200).json({ message: 'Assessment released successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof BadRequestError) {
      res.status(400).json({ error: error.message });
    } else if (error instanceof MissingAuthorizationError) {
      res.status(401).json({ error: 'Missing authorization' });
    } else {
      console.error('Error releasing assessment:', error);
      res.status(500).json({ error: 'Failed to release assessment' });
    }
  }
};

/**
 * Controller method to recall a previously released internal assessment.
 * Sets an assessment's "isReleased" flag back to false, removing its visibility from students.
 *
 * @param {Request} req - The Express request object
 *  - req.params.assessmentId: The ID of the assessment to recall.
 * @param {Response} res - The Express response object
 *
 * @returns {Promise<void>}
 *  - 200 OK: If the assessment is successfully recalled.
 *  - 404 Not Found: If the assessment or account is not found.
 *  - 400 Bad Request: If the user is unauthorized to recall assessments.
 *  - 401 Unauthorized: If authorization is missing.
 *  - 500 Internal Server Error: For any unknown errors.
 */
export const recallInternalAssessment = async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const accountId = await getAccountId(req);

    await recallInternalAssessmentById(assessmentId, accountId);

    res.status(200).json({ message: 'Assessment recalled successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof BadRequestError) {
      res.status(400).json({ error: error.message });
    } else if (error instanceof MissingAuthorizationError) {
      res.status(401).json({ error: 'Missing authorization' });
    } else {
      console.error('Error recalling assessment:', error);
      res.status(500).json({ error: 'Failed to recall assessment' });
    }
  }
};
