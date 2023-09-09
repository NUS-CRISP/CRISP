import { Request, Response } from 'express';
import AssessmentModel, { Assessment } from '../models/Assessment';

// Create a new assessment
export const createAssessment = async (req: Request, res: Response) => {
  try {
    const newAssessment = new AssessmentModel(req.body);
    const savedAssessment = await newAssessment.save();
    res.status(201).json(savedAssessment);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create assessment' });
  }
};

// Get all assessments
export const getAllAssessments = async (req: Request, res: Response) => {
  try {
    const assessments = await AssessmentModel.find();
    res.status(200).json(assessments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
};

// Get a single assessment by ID
export const getAssessmentById = async (req: Request, res: Response) => {
  const assessmentId = req.params.id;
  try {
    const assessment = await AssessmentModel.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }
    res.status(200).json(assessment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assessment' });
  }
};

// Update an assessment by ID
export const updateAssessmentById = async (req: Request, res: Response) => {
  const assessmentId = req.params.id;
  try {
    const updatedAssessment = await AssessmentModel.findByIdAndUpdate(
      assessmentId,
      req.body,
      { new: true }
    );
    if (!updatedAssessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }
    res.status(200).json(updatedAssessment);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update assessment' });
  }
};

// Delete an assessment by ID
export const deleteAssessmentById = async (req: Request, res: Response) => {
  const assessmentId = req.params.id;
  try {
    const deletedAssessment = await AssessmentModel.findByIdAndDelete(assessmentId);
    if (!deletedAssessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }
    res.status(200).json({ message: 'Assessment deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete assessment' });
  }
};