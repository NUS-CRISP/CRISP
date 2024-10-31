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
  uploadInternalAssessmentResultsById,
  updateInternalAssessmentResultMarkerById,
  addQuestionToAssessment,
  deleteQuestionById,
  getQuestionsByAssessmentId,
  updateQuestionById,
  releaseInternalAssessmentById,
  recallInternalAssessmentById,
} from '../services/internalAssessmentService';

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

export const uploadInternalResults = async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const results = req.body.items;
    await uploadInternalAssessmentResultsById(assessmentId, results);
    res.status(200).json({ message: 'Results uploaded successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error uploading results:', error);
      res.status(500).json({ error: 'Failed to upload results' });
    }
  }
};

export const updateInternalResultMarker = async (
  req: Request,
  res: Response
) => {
  try {
    const { assessmentId, resultId } = req.params;
    const { markerId } = req.body;
    await updateInternalAssessmentResultMarkerById(
      assessmentId,
      resultId,
      markerId
    );
    res.status(200).json({ message: 'Marker updated successfully' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Error updating result marker:', error);
      res.status(500).json({ error: 'Failed to update result marker' });
    }
  }
};

/*--------------------------Questions---------------------------------------------*/
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

/*----------------------------Release-Form--------------------------*/
export const releaseInternalAssessment = async (
  req: Request,
  res: Response
) => {
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
