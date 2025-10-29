import PeerReviewModel, { PeerReview } from '@models/PeerReview';
import PeerReviewSettingsModel from '@models/PeerReviewSettings';
import PeerReviewAssignmentModel from '@models/PeerReviewAssignment';
import PeerReviewCommentModel from '@models/PeerReviewComment';
import TeamModel from '@models/Team';
import CourseModel from '@models/Course';
import {
  BadRequestError,
  NotFoundError,
  MissingAuthorizationError,
} from './errors';
import { COURSE_ROLE } from '@shared/types/auth/CourseRole';

export const getPeerReviewAssignmentsByPeerReviewId = async (
  userId: string,
  userCourseRole: string,
  peerReviewId: string
) => {
  // Validate peer review exists
  const peerReview = await PeerReviewModel.findById(peerReviewId);
  if (!peerReview) {
    throw new NotFoundError('Peer review not found');
  }

  // Students can only view their own assignments
  if (userCourseRole === COURSE_ROLE.Student) {
    const studentAssignments = await PeerReviewAssignmentModel.find({
      peerReviewId,
      reviewerUser: userId,
    });
    return studentAssignments;
  }

  const allAssignments = await PeerReviewAssignmentModel.find({ peerReviewId });

  // TAs can view their own assignments (if any) and all assignments they are supervising
  if (userCourseRole === COURSE_ROLE.TA) {
    const taAssignments = allAssignments
      .filter(async a => {
        const reviewerTeam = await TeamModel.findById(a.reviewerTeam);
        if (reviewerTeam && reviewerTeam.TA!.toString() === userId) return true;
        return false;
      })
      .concat(
        allAssignments.filter(a => a.reviewerUser?.toString() === userId)
      );
    return taAssignments;
  }

  // Course coordinators can view all assignments
  return allAssignments;
};

export const getPeerReviewAssignmentsByTeamId = async (
  userCourseRole: string,
  teamId: string
) => {
  // Only course coordinators and TAs can view assignments by team
  if (
    userCourseRole !== COURSE_ROLE.Faculty &&
    userCourseRole !== COURSE_ROLE.TA
  ) {
    throw new MissingAuthorizationError(
      'Only course coordinators and TAs can view peer review assignments by team'
    );
  }

  const assignments = await PeerReviewAssignmentModel.find({
    reviewee: teamId,
  });
  if (!assignments) {
    throw new NotFoundError('No peer review assignments found for this team');
  }
  return assignments;
};

export const getPeerReviewAssignmentById = async (
  userCourseRole: string,
  userId: string,
  assignmentId: string
) => {
  const assignment = await PeerReviewAssignmentModel.findById(assignmentId);
  if (!assignment) throw new NotFoundError('Peer review assignment not found');

  // Check if user is the reviewer user
  const isReviewerUser = assignment.reviewerUser?.toString() === userId;
  if (isReviewerUser) return assignment;

  if (userCourseRole === COURSE_ROLE.Student) {
    // Check if student is part of the reviewer team
    const reviewerTeam = await TeamModel.findById(assignment.reviewerTeam);
    if (reviewerTeam && reviewerTeam.members?.map(String).includes(userId))
      return assignment;

    // Check if student is part of the reviewee team
    const revieweeTeam = await TeamModel.findById(assignment.reviewee);
    if (revieweeTeam && revieweeTeam.members?.map(String).includes(userId))
      return assignment;
  }

  if (userCourseRole === COURSE_ROLE.TA) {
    // Check if TA is supervising the reviewee team
    const revieweeTeam = await TeamModel.findById(assignment.reviewee);
    if (revieweeTeam && revieweeTeam.TA!.toString() === userId)
      return assignment;
  }

  // Course coordinators can view all assignments
  console.log(userCourseRole);
  if (userCourseRole === COURSE_ROLE.Faculty) return assignment;

  throw new MissingAuthorizationError(
    'You are not authorized to view this assignment'
  );
};

export const assignPeerReviewById = async (
  peerReviewId: string,
  assignmentData: any
) => {};

export const randomAssignPeerReviewsById = async (peerReviewId: string) => {};
