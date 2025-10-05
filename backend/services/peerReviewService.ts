import PeerReviewModel from '@models/PeerReview';
import PeerReviewSettingsModel from '@models/PeerReviewSettings';
import PeerReviewAssignmentModel from '@models/PeerReviewAssignment';
import PeerReviewCommentModel from '@models/PeerReviewComment';
import CourseModel from '@models/Course';
import mongoose from 'mongoose';
import { NotFoundError, MissingAuthorizationError } from './errors';
import CourseRole from '@shared/types/auth/CourseRole';

export const getAllPeerReviewsyId = async (courseId: string) => {
  const peerReviews = await PeerReviewModel.find({ course: courseId });
  if (!peerReviews) throw new NotFoundError('No peer reviews found for this course');
  
  const result = peerReviews.map(r => {
    const obj = r.toObject();
    obj.status = obj.computedStatus ?? obj.status; // override with computed status
    return obj;
  });
  return result;
}

export const createPeerReviewById = async (courseId: string, peerReviewData: {
  assessmentName: string;
  description: string;
  startDate: Date;
  endDate: Date;
  reviewerType: 'Individual' | 'Team';
  TaAssignments: boolean;
  minReviews: number;
  maxReviews: number;
  manualAssign: boolean;
  randomAssign: boolean;
}) => {
  const course = await CourseModel.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  
  const {
    assessmentName: title,
    description,
    startDate,
    endDate,
    reviewerType,
    TaAssignments,
    minReviews: minReviewsPerReviewer,
    maxReviews: maxReviewsPerReviewer,
    manualAssign,
    randomAssign,
  } = peerReviewData;
  
  // Basic validation
  const newPeerReview = await PeerReviewModel.create({
    course: course._id,
    title,
    description,
    createdAt: Date.now(),
    startDate,
    endDate,
  });
  
  // Create with settings
  const newSettings = await PeerReviewSettingsModel.create({
    peerReviewId: newPeerReview._id,
    reviewerType,
    TaAssignments,
    minReviewsPerReviewer,
    maxReviewsPerReviewer,
    assignmentMode: manualAssign ? (randomAssign ? 'Hybrid' : 'Manual') : 'Random',
  });
  await newSettings.save();
  
  // Update peer review with settings ID
  newPeerReview.peerReviewSettingsId = newSettings._id;
  await newPeerReview.save();
  return newPeerReview;
}

export const deletePeerReviewById = async (peerReviewId: string) => {
  const peerReview = await PeerReviewModel.findById(peerReviewId);
  if (!peerReview) throw new NotFoundError('Peer review not found');
  
  const deletedSettings = await PeerReviewSettingsModel.deleteOne({ peerReviewId });
  if (!deletedSettings) throw new NotFoundError('Peer review settings not found for deletion');
  const deletedPeerReview = await PeerReviewModel.findByIdAndDelete(peerReviewId);
  if (!deletedPeerReview) throw new NotFoundError('Peer review not found for deletion');
  
  return deletedPeerReview;
}

export const getPeerReviewSettingsById = async (peerReviewId: string) => {
  const settings = await PeerReviewSettingsModel.findOne({ peerReviewId: peerReviewId });
  if (!settings) {
    throw new NotFoundError('Peer review settings not found');
  }
  return settings;
}

export const updatePeerReviewSettingsById = async (peerReviewId: string, settingsData: any) => {
  const {
    assessmentName: title,
    description,
    startDate,
    endDate,
    reviewerType,
    TaAssignments,
    minReviews: minReviewsPerReviewer,
    maxReviews: maxReviewsPerReviewer,
    manualAssign,
    randomAssign,
  } = settingsData;
  
  const peerReviewData = {
    ...(title && { title }),
    ...(description && { description }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
  };
  
  const assignmentMode = manualAssign ? (randomAssign ? 'Hybrid' : 'Manual') : 'Random';
  const settingsOnlyData = {
    ...(reviewerType && { reviewerType }),
    ...(assignmentMode && { assignmentMode }),
    ...(TaAssignments !== undefined && { TaAssignments }),
    ...(minReviewsPerReviewer !== undefined && { minReviewsPerReviewer }),
    ...(maxReviewsPerReviewer !== undefined && { maxReviewsPerReviewer }),
  };

  
  // Update Peer Review
  const peerReview = await PeerReviewModel.findByIdAndUpdate(
    peerReviewId,
    peerReviewData,
    { new: true }
  );
  if (!peerReview) throw new NotFoundError("Peer review not found");

  // Update Settings
  const updatedSettings = await PeerReviewSettingsModel.findOneAndUpdate(
    { peerReviewId },
    settingsOnlyData,
    { new: true }
  );
  if (!updatedSettings) throw new NotFoundError('Peer review settings not found for update');
  return updatedSettings;
}
