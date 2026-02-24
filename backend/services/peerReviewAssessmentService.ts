/* eslint-disable @typescript-eslint/no-explicit-any */
import InternalAssessmentModel from '../models/InternalAssessment';
import CourseModel from '../models/Course';
import { NotFoundError, BadRequestError } from './errors';
import mongoose, { Types } from 'mongoose';
import TeamSetModel from '@models/TeamSet';
import { createAssignmentSet } from './assessmentAssignmentSetService';
import AssessmentResultModel from '@models/AssessmentResult';
import { deleteInternalAssessmentById } from './internalAssessmentService';
import { createPeerReviewById, PeerReviewSettings, updatePeerReviewById, deletePeerReviewById } from './peerReviewService';
import PeerReviewModel from '@models/PeerReview';
import { PeerReviewSubmissionListItemDTO, PeerReviewSubmissionsDTO, ReviewerRef } from '@shared/types/PeerReview';
import PeerReviewSubmissionModel from '@models/PeerReviewSubmission';
import PeerReviewAssignmentModel from '@models/PeerReviewAssignment';
import TeamModel from '@models/Team';
import UserModel from '@models/User';
import { PeerReviewGradingTaskModel } from '@models/PeerReviewGradingTask';

const oid = (s: string) => new Types.ObjectId(s);

/* ------------------------------- Peer Review Assessment ------------------------------- */

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

/* ------------------------------- Peer Review Assessment Submissions ------------------------------- */

const lastActivityAt = (s: any) => s.submittedAt ?? s.lastEditedAt ?? s.startedAt ?? s.createdAt;

export const getPeerReviewSubmissionsForAssessmentById = async (
  assessmentId: string,
): Promise<PeerReviewSubmissionsDTO> => {
  const assessment = await InternalAssessmentModel.findById(assessmentId).select(
    '_id assessmentType maxMarks'
  );
  if (!assessment) throw new NotFoundError('Assessment not found');
  if (assessment.assessmentType !== 'peer_review')
    throw new BadRequestError('Not a peer review assessment');

  const peerReview = await PeerReviewModel.findOne({
    internalAssessmentId: assessmentId,
  }).select(
    '_id reviewerType taAssignments taGradingScope internalAssessmentId'
  );
  if (!peerReview) throw new NotFoundError('Peer review not found for assessment');

  const submissions = await PeerReviewSubmissionModel.find({
    peerReviewId: peerReview._id,
  })
    .lean();

  // Load assignments + reviewee team numbers + repo
  const assignmentIds = submissions.map(s => s.peerReviewAssignmentId);
  const assignments = await PeerReviewAssignmentModel.find({
    _id: { $in: assignmentIds },
  })
    .select('_id reviewee repoName repoUrl')
    .lean();

  const assignmentById = new Map(assignments.map(a => [String(a._id), a]));
  const revieweeTeamIds = assignments.map(a => a.reviewee);
  const revieweeTeams = await TeamModel.find({ _id: { $in: revieweeTeamIds } })
    .select('_id number')
    .lean();
  const teamNumberById = new Map(revieweeTeams.map(t => [String(t._id), t.number]));

  // Reviewer lookups
  const reviewerUserIds = submissions
    .filter(s => s.reviewerUserId)
    .map(s => String(s.reviewerUserId));
  const reviewerTeamIds = submissions
    .filter(s => s.reviewerTeamId)
    .map(s => String(s.reviewerTeamId));

  const [reviewerUsers, reviewerTeams] = await Promise.all([
    reviewerUserIds.length
      ? UserModel.find({ _id: { $in: reviewerUserIds.map(oid) } })
          .select('_id name')
          .lean()
      : Promise.resolve([]),
    reviewerTeamIds.length
      ? TeamModel.find({ _id: { $in: reviewerTeamIds.map(oid) } })
          .select('_id number')
          .lean()
      : Promise.resolve([]),
  ]);

  const userNameById = new Map(reviewerUsers.map(u => [String(u._id), u.name]));
  const reviewerTeamNumberById = new Map(
    reviewerTeams.map(t => [String(t._id), t.number])
  );

  // Grading tasks summary (per submission)
  const subIds = submissions.map(s => s._id);
  const tasks = await PeerReviewGradingTaskModel.find({
    peerReviewId: peerReview._id,
    peerReviewSubmissionId: { $in: subIds },
  })
    .select('peerReviewSubmissionId grader status gradedAt')
    .populate('grader', '_id name')
    .lean();

  const tasksBySubmissionId = new Map<string, any[]>();
  for (const t of tasks) {
    const sid = String(t.peerReviewSubmissionId);
    const arr = tasksBySubmissionId.get(sid) ?? [];
    arr.push(t);
    tasksBySubmissionId.set(sid, arr);
  }

  const items: PeerReviewSubmissionListItemDTO[] = submissions.map(s => {
    const assignment = assignmentById.get(String(s.peerReviewAssignmentId));
    const revieweeTeamId = assignment ? String(assignment.reviewee) : '';
    const revieweeTeamNumber = teamNumberById.get(revieweeTeamId) ?? -1;

    const reviewer: ReviewerRef =
      s.reviewerKind === 'Team' && s.reviewerTeamId
        ? {
            kind: 'Team',
            teamId: String(s.reviewerTeamId),
            teamNumber: reviewerTeamNumberById.get(String(s.reviewerTeamId)) ?? -1,
          }
        : {
            kind: 'User',
            userId: String(s.reviewerUserId ?? ''),
            name: userNameById.get(String(s.reviewerUserId ?? '')) ?? 'Unknown',
          };

    const ts = tasksBySubmissionId.get(String(s._id)) ?? [];
    const gradersMap = new Map<string, { id: string; name: string }>();
    let lastGradedAt: Date | undefined = undefined;
    let completedCount = 0;
    let inProgressCount = 0;
    let assignedCount = 0;

    for (const t of ts) {
      const g = t.grader as any;
      if (g?._id) gradersMap.set(String(g._id), { id: String(g._id), name: g.name });
      if (t.status === 'Completed') completedCount++;
      else if (t.status === 'InProgress') inProgressCount++;
      else assignedCount++;

      if (t.gradedAt) {
        const d = new Date(t.gradedAt);
        if (!lastGradedAt || d > lastGradedAt) lastGradedAt = d;
      }
    }

    return {
      peerReviewId: String(s.peerReviewId),
      peerReviewSubmissionId: String(s._id),
      peerReviewAssignmentId: String(s.peerReviewAssignmentId),
      internalAssessmentId: String(peerReview.internalAssessmentId),

      revieweeTeam: { teamId: revieweeTeamId, teamNumber: revieweeTeamNumber },
      repo: { repoName: assignment?.repoName ?? '', repoUrl: assignment?.repoUrl ?? '' },

      reviewer,
      reviewerKind: s.reviewerKind,

      status: s.status,
      startedAt: s.startedAt,
      lastEditedAt: s.lastEditedAt,
      submittedAt: s.submittedAt,
      createdAt: s.createdAt,

      lastActivityAt: lastActivityAt(s),

      grading: {
        count: ts.length,
        completedCount,
        inProgressCount,
        assignedCount,
        graders: Array.from(gradersMap.values()),
        lastGradedAt,
      },
    };
  });

  // Sort most recent activity first
  items.sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());

  return {
    internalAssessmentId: String(assessment._id),
    peerReviewId: String(peerReview._id),
    reviewerType: peerReview.reviewerType,
    taAssignments: peerReview.taAssignments,
    taGradingScope: peerReview.taGradingScope,
    maxMarks: assessment.maxMarks ?? 0,
    items,
  };
};
