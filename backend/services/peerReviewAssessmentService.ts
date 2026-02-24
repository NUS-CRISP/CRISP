/* eslint-disable @typescript-eslint/no-explicit-any */
import InternalAssessmentModel from '../models/InternalAssessment';
import CourseModel from '../models/Course';
import { NotFoundError, BadRequestError } from './errors';
import mongoose from 'mongoose';
import TeamSetModel from '@models/TeamSet';
import { createAssignmentSet } from './assessmentAssignmentSetService';
import AssessmentResultModel from '@models/AssessmentResult';
import { CRISP_ROLE } from '@shared/types/auth/CrispRole';
import { deleteInternalAssessmentById } from './internalAssessmentService';
import { createPeerReviewById, PeerReviewSettings, updatePeerReviewById, deletePeerReviewById } from './peerReviewService';
import PeerReviewModel from '@models/PeerReview';

export const getPeerReviewByAssessmentId = async (assessmentId: string) => {
  const peerReview = await PeerReviewModel.findOne({
    internalAssessmentId: assessmentId,
  });
  if (!peerReview) throw new NotFoundError('Peer review not found for assessment');
  return peerReview;
};

interface PeerReviewAssessmentData {
  // Shared fields for both internal assessment and peer review objects
  assessmentName: string;
  description: string;
  startDate: Date;
  endDate: Date;
  
  // Peer review fields
  teamSetId: string;
  reviewerType: 'Individual' | 'Team';
  taAssignments: boolean;
  minReviews: number;
  maxReviews: number;
  taGradingScope: 'AssignedOnly' | 'AllSubmissions';
  gradingStartDate?: Date;
  gradingEndDate?: Date;
  
  // Assessment fields
  maxMarks?: number;
  scaleToMaxMarks: boolean;
}

export const createPeerReviewAssessmentForCourse = async (
  courseId: string,
  peerReviewAssessmentData: PeerReviewAssessmentData
) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const {
    assessmentName,
    description,
    startDate,
    endDate,
    teamSetId,
    reviewerType,
    taAssignments,
    minReviews,
    maxReviews,
    taGradingScope,
    gradingStartDate,
    gradingEndDate,
    maxMarks,
    scaleToMaxMarks,
  } = peerReviewAssessmentData;

  try {
    const course = await CourseModel.findById(courseId)
      .populate('students')
      .session(session);
    if (!course) throw new NotFoundError('Course not found');

    const teamSet = await TeamSetModel.findById(teamSetId).session(session);
    if (!teamSet) throw new NotFoundError('TeamSet not found');

    // 1. Create InternalAssessment (peer_review type)
    const assessment = await new InternalAssessmentModel({
      course: courseId,
      assessmentName: assessmentName,
      assessmentType: 'peer_review',
      description: description,
      startDate: startDate,
      endDate: endDate,
      maxMarks: maxMarks,
      scaleToMaxMarks: scaleToMaxMarks,
      granularity: reviewerType.toLowerCase(),
      teamSet: teamSet._id,
      areSubmissionsEditable: false,
      results: [],
      isReleased: false,
      questions: [], // no questions for peer review
      questionsTotalMarks: 0,
      releaseNumber: 0,
    }).save({ session });

    // 2) Create AssessmentResults for all students
    const results = await Promise.all(
      (course.students as any[]).map(student =>
        new AssessmentResultModel({
          assessment: assessment._id,
          student,
          marks: [],
          averageScore: 0,
        }).save({ session })
      )
    );

    assessment.results = results.map(r => r._id);
    await assessment.save({ session });

    course.internalAssessments.push(assessment._id);
    await course.save({ session });

    // 3. Create PeerReview linked to InternalAssessment
    const createPeerReviewData: PeerReviewSettings = {
      assessmentName: assessmentName,
      description: description,
      startDate: startDate,
      endDate: endDate,
      teamSetId: teamSetId,
      reviewerType: reviewerType,
      taAssignments: taAssignments,
      minReviews: minReviews,
      maxReviews: maxReviews,
      taGradingScope: taGradingScope,
      gradingStartDate: gradingStartDate,
      gradingEndDate: gradingEndDate,
      internalAssessmentId: assessment._id.toString(),
    }
    const newPeerReview = await createPeerReviewById(courseId, createPeerReviewData, session);

    await session.commitTransaction();
    session.endSession();

    try {
      await createAssignmentSet(assessment._id.toString(), teamSet._id.toString());
    } catch (e) {
      console.error('createAssignmentSet failed:', e);
    }
    
    return newPeerReview;
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    throw e;
  }
};

export const updatePeerReviewAssessmentById = async (
  assessmentId: string,
  updateData: PeerReviewAssessmentData,
) => {
  const existing = await InternalAssessmentModel.findById(assessmentId).select('assessmentType');
  if (!existing) throw new NotFoundError('Peer review assessment not found');
  if (existing.assessmentType !== 'peer_review')
    throw new BadRequestError('Assessment is not a peer review assessment');

  const updatedAssessmentData = {
    assessmentName: updateData.assessmentName,
    description: updateData.description,
    startDate: updateData.startDate,
    endDate: updateData.endDate,
    maxMarks: updateData.maxMarks,
    scaleToMaxMarks: updateData.scaleToMaxMarks,
    granularity: updateData.reviewerType.toLowerCase(),
    areSubmissionsEditable: false,
  };
  
  const updatedAssessment = await InternalAssessmentModel.findByIdAndUpdate(
    assessmentId,
    updatedAssessmentData,
    { new: true }
  );

  if (!updatedAssessment) throw new NotFoundError('Peer review assessment not found');
  
  const pr = await PeerReviewModel.findOne({ internalAssessmentId: assessmentId }).select('_id');
  if (!pr) throw new NotFoundError('Peer review not found for this assessment');

  const updatedPeerReviewData: PeerReviewSettings = {
    assessmentName: updateData.assessmentName,
    description: updateData.description,
    startDate: updateData.startDate,
    endDate: updateData.endDate,
    teamSetId: updateData.teamSetId,
    reviewerType: updateData.reviewerType,
    taAssignments: updateData.taAssignments,
    minReviews: updateData.minReviews,
    maxReviews: updateData.maxReviews,
    taGradingScope: updateData.taGradingScope,
    gradingStartDate: updateData.gradingStartDate,
    gradingEndDate: updateData.gradingEndDate,
  }
  
  const updatedPeerReview = await updatePeerReviewById(pr._id.toString(), updatedPeerReviewData);
  if (!updatedPeerReview) throw new NotFoundError('Failed to update peer review with new settings');

  return { updatedAssessment, updatedPeerReview };
};

export const deletePeerReviewAssessmentById = async (assessmentId: string) => {
  const pr = await PeerReviewModel.findOne({ internalAssessmentId: assessmentId }).select('_id');
  if (!pr) throw new NotFoundError('Peer review not found for this assessment');
  
  const deletedRes = await deletePeerReviewById(pr._id.toString());
  await deleteInternalAssessmentById(assessmentId);
  
  return deletedRes;
}
