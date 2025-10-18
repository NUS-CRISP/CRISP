import PeerReviewModel from '@models/PeerReview';
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

export const getPeerReviewById = async (peerReviewId: string) => {
  const peerReview = await PeerReviewModel.findById(peerReviewId);
  if (!peerReview) throw new NotFoundError('Peer review not found');
  return peerReview;
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
    createdAt: Date.now(),
    title,
    description,
    startDate,
    endDate,
    teamSetId,
    TaAssignments,
    reviewerType,
    minReviewsPerReviewer,
    maxReviewsPerReviewer,
  });
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
        peerReview: delPeerReviewRes ? 1 : 0,
      },
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const updatePeerReviewById = async (
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

  const updatedPeerReviewData = {
    ...(title && { title }),
    ...(description && { description }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(teamSetId && { teamSetId }),
    ...(reviewerType && { reviewerType }),
    ...(TaAssignments !== undefined && { TaAssignments }),
    ...(minReviewsPerReviewer !== undefined && { minReviewsPerReviewer }),
    ...(maxReviewsPerReviewer !== undefined && { maxReviewsPerReviewer }),
  };

  // Update Peer Review
  const updatedPeerReview = await PeerReviewModel.findByIdAndUpdate(
    peerReviewId,
    updatedPeerReviewData,
    { new: true }
  );
  if (!updatedPeerReview) throw new NotFoundError('Peer review not found');
  return updatedPeerReview;
};
