import PeerReviewModel from '@models/PeerReview';
import PeerReviewSettingsModel from '@models/PeerReviewSettings';
import CourseModel from '@models/Course';
import { NotFoundError } from './errors';
import mongoose from 'mongoose';
import PeerReviewAssignmentModel from '@models/PeerReviewAssignment';
import PeerReviewCommentModel from '@models/PeerReviewComment';

export const getAllPeerReviewsyId = async (courseId: string) => {
  const peerReviews = await PeerReviewModel.find({ course: courseId });
  if (!peerReviews)
    throw new NotFoundError('No peer reviews found for this course');

  const result = peerReviews.map(r => {
    const obj = r.toObject();
    obj.status = obj.computedStatus ?? obj.status; // override with computed status
    return obj;
  });
  return result;
};

export const createPeerReviewById = async (
  courseId: string,
  peerReviewData: {
    assessmentName: string;
    description: string;
    startDate: Date;
    endDate: Date;
    teamSetId: string;
    reviewerType: 'Individual' | 'Team';
    TaAssignments: boolean;
    minReviews: number;
    maxReviews: number;
  }
) => {
  const course = await CourseModel.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }

  const {
    assessmentName: title,
    description,
    startDate,
    endDate,
    teamSetId,
    reviewerType,
    TaAssignments,
    minReviews: minReviewsPerReviewer,
    maxReviews: maxReviewsPerReviewer,
  } = peerReviewData;

  // Basic validation
  const newPeerReview = new PeerReviewModel({
    course: course._id,
    title,
    description,
    createdAt: Date.now(),
    startDate,
    endDate,
    teamSetId,
  });

  // Create with settings
  const newSettings = new PeerReviewSettingsModel({
    peerReviewId: newPeerReview._id,
    reviewerType,
    TaAssignments,
    minReviewsPerReviewer,
    maxReviewsPerReviewer,
  });
  await newSettings.save();

  // Update peer review with settings ID
  newPeerReview.peerReviewSettingsId = newSettings._id;
  await newPeerReview.save();
  return newPeerReview;
};

export const deletePeerReviewById = async (peerReviewId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const peerReview = await PeerReviewModel.findById(peerReviewId);
    if (!peerReview) throw new NotFoundError('Peer review not found');

    const prAssignments = await PeerReviewAssignmentModel.find({
      peerReviewId,
    });
    const assignmentIds = prAssignments.map(assignment => assignment._id);

    // Delete associated comments
    const delCommentsRes = await PeerReviewCommentModel.deleteMany({
      peerReviewAssignmentId: { $in: assignmentIds },
    });

    // Delete peer review assignments
    const delAssignmentsRes = await PeerReviewAssignmentModel.deleteMany({
      peerReviewId,
    });

    // Delete peer review settings
    const delSettingsRes = await PeerReviewSettingsModel.deleteOne({
      peerReviewId,
    });
    if (!delSettingsRes)
      throw new NotFoundError('Peer review settings not found for deletion');

    const delPeerReviewRes =
      await PeerReviewModel.findByIdAndDelete(peerReviewId);
    if (!delPeerReviewRes)
      throw new NotFoundError('Peer review not found for deletion');

    await session.commitTransaction();
    session.endSession();

    return {
      deletedPeerReviewId: peerReviewId,
      deletedPeerReviewTitle: peerReview.title,
      deleted: {
        comments: delCommentsRes.deletedCount || 0,
        assignments: delAssignmentsRes.deletedCount || 0,
        settings: delSettingsRes.deletedCount || 0,
        peerReview: delPeerReviewRes ? 1 : 0,
      },
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const getPeerReviewSettingsById = async (peerReviewId: string) => {
  const settings = await PeerReviewSettingsModel.findOne({
    peerReviewId: peerReviewId,
  });
  if (!settings) {
    throw new NotFoundError('Peer review settings not found');
  }
  return settings;
};

export const updatePeerReviewSettingsById = async (
  peerReviewId: string,
  settingsData: any
) => {
  const {
    assessmentName: title,
    description,
    startDate,
    endDate,
    teamSetId,
    reviewerType,
    TaAssignments,
    minReviews: minReviewsPerReviewer,
    maxReviews: maxReviewsPerReviewer,
  } = settingsData;

  const peerReviewData = {
    ...(title && { title }),
    ...(description && { description }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(teamSetId && { teamSetId }),
  };
  const settingsOnlyData = {
    ...(reviewerType && { reviewerType }),
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
  if (!peerReview) throw new NotFoundError('Peer review not found');

  // Update Settings
  const updatedSettings = await PeerReviewSettingsModel.findOneAndUpdate(
    { peerReviewId },
    settingsOnlyData,
    { new: true }
  );
  if (!updatedSettings)
    throw new NotFoundError('Peer review settings not found for update');
  return updatedSettings;
};
