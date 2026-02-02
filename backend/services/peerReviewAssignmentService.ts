import PeerReviewAssignmentModel from '@models/PeerReviewAssignment';
import TeamModel, { Team } from '@models/Team';
import { BadRequestError, NotFoundError } from './errors';
import TeamDataModel, { TeamData } from '@models/TeamData';
import { Types } from 'mongoose';
import { getPeerReviewById, getTeamDataById } from './peerReviewService';
import type { AnyBulkWriteOperation } from 'mongodb';
import { COURSE_ROLE } from '@shared/types/auth/CourseRole';
import { MissingAuthorizationError } from './errors';
import PeerReviewSubmissionModel from '@models/PeerReviewSubmission';

export interface NormalizedTeam {
  id: string;
  number: number;
  memberIds: string[];
  taId: string | null;
}

const oid = (s: string) => new Types.ObjectId(s);

export const getPeerReviewAssignmentById = async (
  userCourseRole: string,
  userId: string,
  assignmentId: string
) => {
  const assignment = await PeerReviewAssignmentModel.findById(assignmentId);
  if (!assignment) throw new NotFoundError('Peer review assignment not found');
  
  // Faculty can access all assignments
  if (userCourseRole === COURSE_ROLE.Faculty) return assignment;
  
  const peerReview = await getPeerReviewById(assignment.peerReviewId.toString());
  const reviewerType = peerReview.reviewerType;
  const teamSetId = peerReview.teamSetId.toString();
  
  // Case 1: Direct Reviewer (Student/TA)
  const isDirectReviewer = await PeerReviewSubmissionModel.exists({
    peerReviewAssignmentId: assignmentId,
    reviewerUserId: userId,
    reviewerKind: { $in: ['Student', 'TA'] },
  });
  
  if (isDirectReviewer) return assignment;
  
  // Case 2: Student Role Checks
  if (userCourseRole === COURSE_ROLE.Student) {
    // Check if student is part of the reviewee team
    const revieweeTeam = await TeamModel.findById(assignment.reviewee).select('_id members').lean();
    if (revieweeTeam && revieweeTeam.members?.includes(oid(userId)))
      return assignment;
  }

  if (userCourseRole === COURSE_ROLE.TA) {
    // Check if TA is supervising the reviewee team
    const revieweeTeam = await TeamModel.findById(assignment.reviewee).select('_id TA').lean();
    if (revieweeTeam && revieweeTeam.TA?.toString() === userId) return assignment;
  };
  
  throw new MissingAuthorizationError(
    'You are not authorized to view this assignment'
  );
};

// Assign peer reviews for a given peer review ID
export const assignPeerReviews = async (
  courseId: string,
  peerReviewId: string,
  userId: string,
  reviewsPerReviewer: number,
  allowSameTA: boolean,
  groupsToAssign: string[]
) => {
  if (!Number.isInteger(reviewsPerReviewer) || reviewsPerReviewer <= 0) {
    throw new BadRequestError('reviewsPerReviewer must be a positive integer');
  } else if (!Array.isArray(groupsToAssign) || groupsToAssign.length === 0) {
    throw new BadRequestError('At least one group must be selected to assign');
  }

  const peerReview = await getPeerReviewById(peerReviewId);
  const reviewerType = peerReview.reviewerType;
  const taAssignmentsEnabled = peerReview.taAssignments;
  const teamSetId = peerReview.teamSetId;
  const assignDefault = groupsToAssign.includes('default');
  const assignTAs = groupsToAssign.includes('assignTAs');

  // Prepare data structures
  const {
    teams: prTeams,
    prTeamIds,
    teamIdToTeamMap,
    teamIdToTAMap,
    teamIdToRepoMap,
  } = await prepareData(courseId, teamSetId.toString());

  // Helper to get repo info for a team
  const getTeamRepo = (teamId: string) => {
    const num = teamIdToTeamMap.get(teamId)!.number;
    return (
      teamIdToRepoMap.get(num.toString()) || {
        repoUrl: '',
        repoName: '',
        gitHubOrgName: '',
      }
    );
  };

  // Build Reviewer Pools
  const {
    studentReviewers,
    studentHomeTeam,
    teamReviewers,
    taReviewers,
    taHomeTeams,
  } = buildReviewerPools(
    prTeams,
    prTeamIds,
    taAssignmentsEnabled,
    assignDefault,
    assignTAs
  );

  console.log('studentReviewers:', studentReviewers);
  console.log('teamReviewers:', teamReviewers);
  console.log('taReviewers:', taReviewers);
  console.log('studentHomeTeam:', studentHomeTeam);
  console.log('taHomeTeams:', taHomeTeams);

  // Get Eligible Reviewees
  const {
    studentToEligibleRevieweesMap,
    teamToEligibleRevieweesMap,
    taToEligibleRevieweesMap,
  } = buildEligibleRevieweeMaps(
    reviewerType,
    studentReviewers,
    studentHomeTeam,
    teamReviewers,
    taReviewers,
    taHomeTeams,
    teamIdToTeamMap,
    teamIdToTAMap,
    prTeamIds,
    allowSameTA,
    reviewsPerReviewer,
    taAssignmentsEnabled,
    assignDefault,
    assignTAs
  );

  console.log('studentToEligibleRevieweesMap:', studentToEligibleRevieweesMap);
  console.log('teamToEligibleRevieweesMap:', teamToEligibleRevieweesMap);
  console.log('taToEligibleRevieweesMap:', taToEligibleRevieweesMap);

  // Perform assignments
  const { assignedStudentsForTeam, assignedTeamsForTeam, assignedTAsForTeam } =
    performAssignments(
      reviewerType,
      prTeamIds,
      studentReviewers,
      teamReviewers,
      taReviewers,
      studentToEligibleRevieweesMap,
      teamToEligibleRevieweesMap,
      taToEligibleRevieweesMap,
      reviewsPerReviewer,
      taAssignmentsEnabled,
      assignDefault,
      assignTAs
    );

  console.log('assignedStudentsForTeam:', assignedStudentsForTeam);
  console.log('assignedTeamsForTeam:', assignedTeamsForTeam);
  console.log('assignedTAsForTeam:', assignedTAsForTeam);
  console.log('assignments completed, updating database...');

  await updateDBAssignmentsAndSubmissions(
    peerReviewId,
    userId,
    reviewerType,
    taAssignmentsEnabled,
    assignDefault,
    assignTAs,
    prTeamIds,
    getTeamRepo,
    assignedStudentsForTeam,
    assignedTeamsForTeam,
    assignedTAsForTeam
  );
};

// Assign a particular reviewer to a particular assignment
export const addManualAssignment = async (
  courseId: string,
  peerReviewId: string,
  revieweeId: string,
  reviewerId: string,
  userId: string,
  isTA: boolean
) => {
  const peerReview = await getPeerReviewById(peerReviewId);
  const reviewerType = peerReview.reviewerType;
  const maxReviewsPerReviewer = peerReview.maxReviewsPerReviewer;
  const teamSetId = peerReview.teamSetId;

  const reviewee = await TeamModel.findOne({
    _id: revieweeId,
    teamSet: teamSetId,
  })
    .select('number')
    .lean();
    
  if (!reviewee) {
    throw new NotFoundError(
      'Reviewee team not found in the peer review team set'
    );
  }

  console.log('checking manual assignment eligibility...');
  // Check if reviewer is eligible to review the reviewee
  await checkReviewerIsEligible(
    reviewerType,
    teamSetId.toString(),
    reviewerId,
    revieweeId,
    isTA
  );

  console.log('checking manual assignment limits...');
  // Check if reviewer has exceeded max reviews, TAs have no limit
  if (!isTA) {
    await checkMaxReviewsNotExceeded(
      reviewerType,
      peerReviewId,
      reviewerId,
      maxReviewsPerReviewer
    );
  }
  
  // Ensure assignment exists (and fetch its id)
  const teamData = await TeamDataModel.findOne({
    course: courseId,
    teamId: reviewee.number,
  })
    .select('repoName')
    .lean();
    
  // TODO: Derive repo URL for this team, for now fix example in upsert function

  const assignmentId = await ensureAssignmentForReviewee(
    peerReviewId,
    revieweeId,
    teamData?.repoName ?? '',
    'https://github.com/gongg21/AddSubtract.git',
  );

  console.log('checking manual assignment duplicates...');
  // Check if duplicate assignment
  await checkIsNotDuplicateSubmission(
    peerReviewId,
    assignmentId,
    reviewerType,
    reviewerId,
    isTA,
  );

  console.log('creating submission...');
  // Add reviewer to assignment (create new assignment if none exists)
  await createSubmission(
    peerReviewId,
    assignmentId,
    reviewerType,
    reviewerId,
    isTA,
  );
};

// Remove a particular reviewer from a particular assignment
export const removeManualAssignment = async (
  peerReviewId: string,
  revieweeId: string,
  reviewerId: string,
  isTA: boolean
) => {
  const peerReview = await getPeerReviewById(peerReviewId);
  const reviewerType = peerReview.reviewerType;

  const existingAssignment = await PeerReviewAssignmentModel.findOne({
    peerReviewId,
    reviewee: revieweeId,
  })
    .select('_id')
    .lean();
    
  if (!existingAssignment) {
    return; // Nothing to remove
  }
  
  const filter = buildSubmissionIdentityFilter(
    reviewerType,
    reviewerId,
    isTA,
  );
  
  await PeerReviewSubmissionModel.deleteOne({
    peerReviewId: peerReviewId,
    peerReviewAssignmentId: existingAssignment._id,
    ...filter,
  });
};

// Initialise empty assignments for new peer reviews
export const initialiseAssignments = async (
  courseId: string,
  peerReviewId: string,
  teamSetId: string,
  userId: string
) => {
  const prTeams: Team[] = await TeamModel.find({
    teamSet: teamSetId,
  }).lean();

  const prTeamDataById = await getTeamDataById(
    courseId,
    prTeams.map(t => t.number)
  );

  for (const team of prTeams) {
    const newAssignment = new PeerReviewAssignmentModel({
      peerReviewId: peerReviewId,
      repoName: prTeamDataById.get(team.number.toString())?.repoName || '', // TODO: derive actual repo name
      repoUrl: 'https://github.com/gongg21/AddSubtract.git', // TODO: derive actual repo URL
      reviewee: team._id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await newAssignment.save();
  }
  return;
};

// Delete all assignments for a given peer review ID
export const deleteAssignmentsByPeerReviewId = async (peerReviewId: string) => {
  await PeerReviewSubmissionModel.deleteMany({ peerReviewId });
  return await PeerReviewAssignmentModel.deleteMany({ peerReviewId });
};

/* ------ Sub Functions for AssignPeerReviews ------ */

const prepareData = async (courseId: string, teamSetId: string) => {
  const prTeams = await TeamModel.find({ teamSet: teamSetId })
    .select('_id number members TA')
    .lean();

  if (prTeams.length < 2) {
    throw new BadRequestError('Not enough teams to assign reviews');
  }

  const teams = prTeams.map(t => ({
    id: t._id.toString(),
    number: t.number,
    taId: t.TA ? t.TA.toString() : null,
    memberIds: t.members ? t.members.map(m => m.toString()) : [],
  }));

  // Prepare data structures
  const prTeamIds = teams.map(t => t.id);
  const prTeamNumbers = teams.map(t => t.number);
  const teamIdToTeamMap = new Map(teams.map(t => [t.id, t]));
  const teamIdToTAMap = new Map(teams.map(t => [t.id, t.taId]));

  const prTeamDatas = await TeamDataModel.find({
    course: courseId,
    teamId: { $in: prTeamNumbers },
  })
    .select('teamId gitHubOrgName repoName')
    .lean();

  const teamIdToRepoMap = new Map(
    prTeamDatas.map(td => [
      td.teamId.toString(),
      {
        gitHubOrgName: td.gitHubOrgName || '',
        repoName: td.repoName || '',
        repoUrl: 'https://github.com/gongg21/AddSubtract.git',
      },
    ])
  );

  return {
    teams,
    prTeamIds,
    teamIdToTeamMap,
    teamIdToTAMap,
    teamIdToRepoMap,
  };
};

const buildReviewerPools = (
  prTeams: NormalizedTeam[],
  prTeamIds: string[],
  taAssignmentsEnabled: boolean,
  assignDefault: boolean,
  assignTAs: boolean
) => {
  // Students Reviewers Pool
  const studentReviewers: string[] = [];
  const studentHomeTeam = new Map<string, string>(); // userId -> teamId

  // Team Reviewers Pool
  let teamReviewers: string[] = [];

  if (assignDefault) {
    for (const team of prTeams) {
      const tid = team.id;
      for (const memberId of team.memberIds ?? []) {
        const mid = memberId;
        studentReviewers.push(mid);
        studentHomeTeam.set(mid, tid);
      }
    }
    teamReviewers = [...prTeamIds];
  }

  // TA Reviewers Pool (when taAssignmentsEnabled)
  const taReviewers = Array.from(
    new Set(prTeams.map(t => t.taId).filter((x): x is string => Boolean(x)))
  );
  const taHomeTeams = new Map<string, string[]>(); // taId -> teamIds
  if (taAssignmentsEnabled && assignTAs) {
    for (const team of prTeams) {
      const ta = team.taId;
      if (ta) {
        const val = taHomeTeams.get(ta) ?? [];
        val.push(team.id);
        taHomeTeams.set(ta, val);
      }
    }
  }

  return {
    studentReviewers,
    studentHomeTeam,
    teamReviewers,
    taReviewers,
    taHomeTeams,
  };
};

const buildEligibleRevieweeMaps = (
  reviewerType: string,
  studentReviewers: string[],
  studentHomeTeam: Map<string, string>,
  teamReviewers: string[],
  taReviewers: string[],
  taHomeTeams: Map<string, string[]>,
  teamIdToTeamMap: Map<string, NormalizedTeam>,
  teamIdToTAMap: Map<string, string | null>,
  prTeamIds: string[],
  allowSameTA: boolean,
  reviewsPerReviewer: number,
  taAssignmentsEnabled: boolean,
  assignDefault: boolean,
  assignTAs: boolean
) => {
  console.log('allowSameTA:', allowSameTA);
  console.log('reviewsPerReviewer:', reviewsPerReviewer);

  const studentToEligibleRevieweesMap = new Map<string, string[]>();
  if (reviewerType === 'Individual' && assignDefault) {
    for (const studentId of studentReviewers) {
      const homeTeamId = studentHomeTeam.get(studentId)!;
      console.log('homeTeamId for student', studentId, ':', homeTeamId);
      const eligibleReviewees = makeEligibleReviewees(
        teamIdToTAMap,
        prTeamIds,
        allowSameTA,
        homeTeamId
      );
      console.log(
        'eligibleReviewees for student',
        studentId,
        ':',
        eligibleReviewees
      );
      if (eligibleReviewees.length < reviewsPerReviewer) {
        throw new BadRequestError(
          `Not enough eligible reviewees for students in team ${teamIdToTeamMap.get(homeTeamId)?.number}. ` +
            'Consider allowing reviews of teams with same TA or reducing the number of reviews per reviewer.'
        );
      }
      studentToEligibleRevieweesMap.set(studentId, eligibleReviewees);
    }
  }

  // Get Eligible Reviewees for Teams [cannot review own team, and (if !allowSameTA) cannot review teams with same TA]
  const teamToEligibleRevieweesMap = new Map<string, string[]>();
  if (reviewerType === 'Team' && assignDefault) {
    for (const teamId of teamReviewers) {
      const eligibleReviewees = makeEligibleReviewees(
        teamIdToTAMap,
        prTeamIds,
        allowSameTA,
        teamId
      );
      if (eligibleReviewees.length < reviewsPerReviewer) {
        throw new BadRequestError(
          `Not enough eligible reviewees for team ${teamIdToTeamMap.get(teamId)?.number}. ` +
            'Consider allowing reviews of teams with same TA or reducing the number of reviews per reviewer.'
        );
      }
      teamToEligibleRevieweesMap.set(teamId, eligibleReviewees);
    }
  }

  // Get Eligible Reviewees for TAs [cannot review teams they supervise]
  const taToEligibleRevieweesMap = new Map<string, string[]>();
  if (taAssignmentsEnabled && assignTAs) {
    for (const taId of taReviewers) {
      let eligibleReviewees = prTeamIds;
      if (!allowSameTA) {
        const supervisedTeams = new Set(taHomeTeams.get(taId) ?? []);
        eligibleReviewees = prTeamIds.filter(tid => !supervisedTeams.has(tid));
      }
      if (eligibleReviewees.length < reviewsPerReviewer) {
        throw new BadRequestError(
          `Not enough eligible reviewees for TAs. ` +
            'Consider reducing the number of reviews per reviewer.'
        );
      }
      taToEligibleRevieweesMap.set(taId, eligibleReviewees);
    }
  }

  return {
    studentToEligibleRevieweesMap,
    teamToEligibleRevieweesMap,
    taToEligibleRevieweesMap,
  };
};

const performAssignments = (
  reviewerType: string,
  prTeamIds: string[],
  studentReviewers: string[],
  teamReviewers: string[],
  taReviewers: string[],
  studentToEligibleRevieweesMap: Map<string, string[]>,
  teamToEligibleRevieweesMap: Map<string, string[]>,
  taToEligibleRevieweesMap: Map<string, string[]>,
  reviewsPerReviewer: number,
  taAssignmentsEnabled: boolean,
  assignDefault: boolean,
  assignTAs: boolean
) => {
  const assignedStudentsForTeam = new Map<string, Set<string>>(); // revieweeId -> set of studentReviewerIds
  const assignedTeamsForTeam = new Map<string, Set<string>>(); // revieweeId -> set of teamReviewerIds
  const assignedTAsForTeam = new Map<string, Set<string>>(); // revieweeId -> set of taReviewerIds

  for (const teamId of prTeamIds) {
    assignedStudentsForTeam.set(teamId, new Set());
    assignedTeamsForTeam.set(teamId, new Set());
    assignedTAsForTeam.set(teamId, new Set());
  }

  if (reviewerType === 'Individual' && assignDefault) {
    randomAndEqualAssign(
      studentReviewers,
      reviewsPerReviewer,
      studentToEligibleRevieweesMap,
      assignedStudentsForTeam,
      'student'
    );
  } else if (assignDefault) {
    randomAndEqualAssign(
      teamReviewers,
      reviewsPerReviewer,
      teamToEligibleRevieweesMap,
      assignedTeamsForTeam,
      'team'
    );
  }

  if (taAssignmentsEnabled && assignTAs && taReviewers.length > 0) {
    randomAndEqualAssign(
      taReviewers,
      reviewsPerReviewer,
      taToEligibleRevieweesMap,
      assignedTAsForTeam,
      'TA'
    );
  }

  return { assignedStudentsForTeam, assignedTeamsForTeam, assignedTAsForTeam };
};

const updateDBAssignmentsAndSubmissions = async (
  peerReviewId: string,
  userId: string,
  reviewerType: string,
  taAssignmentsEnabled: boolean,
  assignDefault: boolean,
  assignTAs: boolean,
  prTeamIds: string[],
  getTeamRepo: (teamId: string) => { repoUrl: string; repoName: string; gitHubOrgName: string },
  assignedStudentsForTeam: Map<string, Set<string>>,
  assignedTeamsForTeam: Map<string, Set<string>>,
  assignedTAsForTeam: Map<string, Set<string>>
) => {
  // 1. Ensure assignments exist for each reviewee team (and update repo info)
  const assignmentByReviewee = await upsertAndLoadAssignments(
    peerReviewId,
    prTeamIds,
    getTeamRepo,
  );

  // 2. Load existing submissions for these assignments (so we can do partial updates)
  const existing = await loadExistingSubmissions(
    peerReviewId,
    Array.from(assignmentByReviewee.values()).map(a => a._id.toString()),
  );

  // 3. Build desired reviewer sets per assignment (based on assignDefault/assignTAs flags)
  const desired = buildDesiredReviewerSets(
    reviewerType,
    taAssignmentsEnabled,
    assignDefault,
    assignTAs,
    prTeamIds,
    assignmentByReviewee,
    assignedStudentsForTeam,
    assignedTeamsForTeam,
    assignedTAsForTeam,
    existing,
  );

  // 4. Compute diffs and apply (bulk ops)
  await applySubmissionDiffs(
    peerReviewId,
    desired,
    existing,
  );

  // 5. Remove assignments (and their submissions) for teams no longer in prTeamIds
  await deleteStaleAssignmentsAndSubmissions(peerReviewId, prTeamIds);
};

const upsertAndLoadAssignments = async (
  peerReviewId: string,
  prTeamIds: string[],
  getTeamRepo: (teamId: string) => { repoUrl: string; repoName: string; gitHubOrgName: string },
) => {
  const now = new Date();
  const ops: AnyBulkWriteOperation[] = prTeamIds.map(reviewee => {
    const { repoName, repoUrl } = getTeamRepo(reviewee);
    return {
      updateOne: {
        filter: { peerReviewId: oid(peerReviewId), reviewee: oid(reviewee) },
        update: {
          $set: { repoName, repoUrl, updatedAt: now },
          $setOnInsert: {
            peerReviewId: oid(peerReviewId),
            reviewee: oid(reviewee),
            createdAt: now,
            updatedAt: now,
          },
        },
        upsert: true,
      },
    };
  });

  if (ops.length > 0) {
    await PeerReviewAssignmentModel.bulkWrite(ops, { ordered: true });
  }

  const finalAssignments = await PeerReviewAssignmentModel.find({
    peerReviewId: oid(peerReviewId),
    reviewee: { $in: prTeamIds.map(oid) },
  })
    .select('_id reviewee repoName repoUrl')
    .lean();

  const finalMap = new Map<string, (typeof finalAssignments)[number]>();
  for (const a of finalAssignments) {
    finalMap.set(a.reviewee.toString(), a);
  }
  return finalMap;
};

const loadExistingSubmissions = async (
  peerReviewId: string,
  assignmentIds: string[],
) => {
  const subs = await PeerReviewSubmissionModel.find({
    peerReviewId: oid(peerReviewId),
    peerReviewAssignmentId: { $in: assignmentIds.map(oid) },
  })
    .select('_id peerReviewAssignmentId reviewerKind reviewerUserId reviewerTeamId status')
    .lean();

  // Key: assignmentId -> { Student: Set(userId), Team: Set(teamId), TA: Set(userId) }
  const byAssignment = new Map<
    string,
    { Student: Set<string>; Team: Set<string>; TA: Set<string> }
  >();

  for (const s of subs) {
    const aid = s.peerReviewAssignmentId.toString();
    if (!byAssignment.has(aid)) {
      byAssignment.set(aid, { Student: new Set(), Team: new Set(), TA: new Set() });
    }
    const entry = byAssignment.get(aid)!;

    if (s.reviewerKind === 'Student' && s.reviewerUserId) entry.Student.add(s.reviewerUserId.toString());
    if (s.reviewerKind === 'TA' && s.reviewerUserId) entry.TA.add(s.reviewerUserId.toString());
    if (s.reviewerKind === 'Team' && s.reviewerTeamId) entry.Team.add(s.reviewerTeamId.toString());
  }

  return { subs, byAssignment };
};

const buildDesiredReviewerSets = (
  reviewerType: string,
  taAssignmentsEnabled: boolean,
  assignDefault: boolean,
  assignTAs: boolean,
  prTeamIds: string[],
  assignmentByReviewee: Map<string, any>,
  assignedStudentsForTeam: Map<string, Set<string>>,
  assignedTeamsForTeam: Map<string, Set<string>>,
  assignedTAsForTeam: Map<string, Set<string>>,
  existing: {
    subs: any[];
    byAssignment: Map<string, { Student: Set<string>; Team: Set<string>; TA: Set<string> }>;
  },
) => {
  const desired = new Map<
    string,
    { Student: Set<string>; Team: Set<string>; TA: Set<string> }
  >();

  for (const reviewee of prTeamIds) {
    const assignment = assignmentByReviewee.get(reviewee);
    const assignmentId = assignment._id.toString();

    const prev = existing.byAssignment.get(assignmentId) ?? {
      Student: new Set<string>(),
      Team: new Set<string>(),
      TA: new Set<string>(),
    };

    // Default group: Student/Team reviewers
    const nextStudent =
      reviewerType === 'Individual'
        ? assignDefault
          ? new Set(Array.from(assignedStudentsForTeam.get(reviewee) ?? []))
          : prev.Student
        : new Set<string>();

    const nextTeam =
      reviewerType === 'Team'
        ? assignDefault
          ? new Set(Array.from(assignedTeamsForTeam.get(reviewee) ?? []))
          : prev.Team
        : new Set<string>();

    // TA group
    const nextTA =
      !taAssignmentsEnabled
        ? new Set<string>()
        : assignTAs
          ? new Set(Array.from(assignedTAsForTeam.get(reviewee) ?? []))
          : prev.TA;

    desired.set(assignmentId, { Student: nextStudent, Team: nextTeam, TA: nextTA });
  }

  return desired;
};

const applySubmissionDiffs = async (
  peerReviewId: string,
  desired: Map<string, { Student: Set<string>; Team: Set<string>; TA: Set<string> }>,
  existing: {
    subs: any[];
    byAssignment: Map<string, { Student: Set<string>; Team: Set<string>; TA: Set<string> }>;
  },
) => {
  const now = new Date();
  const ops: AnyBulkWriteOperation[] = [];

  for (const [assignmentId, want] of desired.entries()) {
    const have =
      existing.byAssignment.get(assignmentId) ?? { Student: new Set<string>(), Team: new Set<string>(), TA: new Set<string>() };

    // Student diffs
    diffSets(have.Student, want.Student).forEach(d => {
      ops.push({
        deleteMany: {
          filter: {
            peerReviewId: oid(peerReviewId),
            peerReviewAssignmentId: oid(assignmentId),
            reviewerKind: 'Student',
            reviewerUserId: oid(d),
          },
        },
      });
    });
    diffSets(want.Student, have.Student).forEach(d => {
      ops.push({
        insertOne: {
          document: {
            peerReviewId: oid(peerReviewId),
            peerReviewAssignmentId: oid(assignmentId),
            reviewerKind: 'Student',
            reviewerUserId: oid(d),
            status: 'NotStarted',
            createdAt: now,
            updatedAt: now,
            scores: {}, // safe default
          },
        },
      });
    });

    // Team diffs
    diffSets(have.Team, want.Team).forEach(d => {
      ops.push({
        deleteMany: {
          filter: {
            peerReviewId: oid(peerReviewId),
            peerReviewAssignmentId: oid(assignmentId),
            reviewerKind: 'Team',
            reviewerTeamId: oid(d),
          },
        },
      });
    });
    diffSets(want.Team, have.Team).forEach(d => {
      ops.push({
        insertOne: {
          document: {
            peerReviewId: oid(peerReviewId),
            peerReviewAssignmentId: oid(assignmentId),
            reviewerKind: 'Team',
            reviewerTeamId: oid(d),
            status: 'NotStarted',
            createdAt: now,
            updatedAt: now,
            scores: {},
          },
        },
      });
    });

    // TA diffs
    diffSets(have.TA, want.TA).forEach(d => {
      ops.push({
        deleteMany: {
          filter: {
            peerReviewId: oid(peerReviewId),
            peerReviewAssignmentId: oid(assignmentId),
            reviewerKind: 'TA',
            reviewerUserId: oid(d),
          },
        },
      });
    });
    diffSets(want.TA, have.TA).forEach(d => {
      ops.push({
        insertOne: {
          document: {
            peerReviewId: oid(peerReviewId),
            peerReviewAssignmentId: oid(assignmentId),
            reviewerKind: 'TA',
            reviewerUserId: oid(d),
            status: 'NotStarted',
            createdAt: now,
            updatedAt: now,
            scores: {},
          },
        },
      });
    });
  }

  if (ops.length > 0) {
    await PeerReviewSubmissionModel.bulkWrite(ops, { ordered: true });
  }
};

const diffSets = (a: Set<string>, b: Set<string>) => {
  // returns elements in a but not in b
  const out: string[] = [];
  for (const x of a) if (!b.has(x)) out.push(x);
  return out;
};

const deleteStaleAssignmentsAndSubmissions = async (
  peerReviewId: string,
  prTeamIds: string[]
) => {
  const peerReviewIdObj = oid(peerReviewId);

  // Find assignments that will be deleted
  const staleAssignments: { _id: Types.ObjectId }[] =
    await PeerReviewAssignmentModel.find({
      peerReviewId: peerReviewIdObj,
      reviewee: { $nin: prTeamIds.map(oid) },
    })
      .select('_id')
      .lean();

  const staleAssignmentIds = staleAssignments.map(a => a._id);

  // Delete their submissions first to avoid orphans
  if (staleAssignmentIds.length > 0) {
    await PeerReviewSubmissionModel.deleteMany({
      peerReviewId: peerReviewIdObj,
      peerReviewAssignmentId: { $in: staleAssignmentIds },
    });
  }

  // Then delete the assignments
  await PeerReviewAssignmentModel.deleteMany({
    peerReviewId: peerReviewIdObj,
    reviewee: { $nin: prTeamIds.map(oid) },
  });
};

// Shuffle array in place using Fisher-Yates algorithm
const shuffleInPlace = <T>(arr: T[]) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Get eligible reviewees for a reviewer, considering TA constraints
const makeEligibleReviewees = (
  teamIdToTAMap: Map<string, string | null>,
  prTeamIds: string[],
  allowSameTA: boolean,
  homeTeamId: string
) => {
  const homeTA = teamIdToTAMap.get(homeTeamId);
  console.log('homeTeamId:', homeTeamId, 'homeTA:', homeTA);
  console.log('prTeamIds:', prTeamIds);
  return prTeamIds.filter(tid => {
    if (tid === homeTeamId) return false; // cannot review own team
    if (!allowSameTA) {
      const targetTA = teamIdToTAMap.get(tid);
      if (homeTA && targetTA && homeTA === targetTA) return false; // cannot review teams with same TA
    }
    return true;
  });
};

// Randomly and equally assign reviewees to reviewers
const randomAndEqualAssign = (
  reviewerIds: string[],
  reviewsPerReviewer: number,
  eligibleRevieweesMap: Map<string, string[]>,
  assignedForTeamMap: Map<string, Set<string>>,
  label: 'student' | 'team' | 'TA'
) => {
  const slots: string[] = [];
  for (const reviewerId of reviewerIds) {
    for (let i = 0; i < reviewsPerReviewer; i++) {
      slots.push(reviewerId);
    }
  }

  shuffleInPlace(slots);

  const load = (teamId: string) => assignedForTeamMap.get(teamId)?.size ?? 0;

  for (const reviewerId of slots) {
    const eligibleReviewees = eligibleRevieweesMap.get(reviewerId);
    if (!eligibleReviewees || eligibleReviewees.length === 0) {
      throw new Error(
        `No eligible reviewees available for ${label} reviewer ${reviewerId}`
      );
    }
    eligibleReviewees.sort((a, b) => load(a) - load(b));

    const next = eligibleReviewees.find(teamId => {
      const assignedSet = assignedForTeamMap.get(teamId);
      return !assignedSet || !assignedSet.has(reviewerId);
    });

    if (!next) {
      throw new BadRequestError(
        `Unable to assign enough reviews for ${label} reviewer ${reviewerId}. ` +
          'Consider allowing reviews of teams with same TA or reducing the number of reviews per reviewer.'
      );
    }

    if (!assignedForTeamMap.has(next)) {
      assignedForTeamMap.set(next, new Set());
    }
    assignedForTeamMap.get(next)!.add(reviewerId);
  }
};

/* ------ Sub Functions for AddManualAssignment ------ */

const checkReviewerIsEligible = async (
  reviewerType: 'Individual' | 'Team',
  teamSetId: string,
  reviewerId: string,
  revieweeId: string,
  isTA: boolean
) => {
  if (isTA) {
    // Reviewer must be a TA of a team in the team set
    const taTeam = await TeamModel.findOne({
      teamSet: teamSetId,
      TA: reviewerId,
    })
      .select('_id TA')
      .lean();
    if (!taTeam) {
      throw new NotFoundError(
        'Reviewer not found as a TA of any team in the peer review team set'
      );
    }
    return;
  }

  if (reviewerType === 'Individual') {
    // Reviewer must be a member of a team in the team set
    const reviewerTeam = await TeamModel.findOne({
      teamSet: teamSetId,
      members: reviewerId,
    })
      .select('_id members')
      .lean();
    if (!reviewerTeam) {
      throw new NotFoundError(
        'Reviewer not found as a member of any team in the peer review team set'
      );
    }

    if (reviewerTeam._id.toString() === revieweeId) {
      throw new BadRequestError('Reviewer cannot review their own team');
    }
  } else {
    // Reviewer must be a team in the team set
    const reviewerTeam = await TeamModel.findOne({
      teamSet: teamSetId,
      _id: reviewerId,
    })
      .select('_id')
      .lean();
    if (!reviewerTeam) {
      throw new NotFoundError(
        'Reviewer team not found in the peer review team set'
      );
    }
    if (reviewerId === revieweeId) {
      throw new BadRequestError('Team cannot review itself');
    }
  }
};

const checkMaxReviewsNotExceeded = async (
  reviewerType: 'Individual' | 'Team',
  peerReviewId: string,
  reviewerId: string,
  maxPerReviewer: number
) => {
  if (reviewerType === 'Individual') {
    const currentAssignmentsCount =
      await PeerReviewAssignmentModel.countDocuments({
        peerReviewId,
        studentReviewers: reviewerId,
      });
    if (currentAssignmentsCount >= maxPerReviewer) {
      throw new BadRequestError(
        'Reviewer has reached the maximum number of assigned reviews'
      );
    }
  } else {
    const currentAssignmentsCount =
      await PeerReviewAssignmentModel.countDocuments({
        peerReviewId,
        teamReviewers: reviewerId,
      });
    if (currentAssignmentsCount >= maxPerReviewer) {
      throw new BadRequestError(
        'Reviewer team has reached the maximum number of assigned reviews'
      );
    }
  }
};

const ensureAssignmentForReviewee = async (
  peerReviewId: string,
  reviewee: string,
  repoName: string,
  repoUrl: string
) => {
  const now = new Date();

  const res = await PeerReviewAssignmentModel.findOneAndUpdate(
    { peerReviewId, reviewee },
    {
      $set: { repoName, repoUrl, updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true, new: true }
  )
    .select('_id')
    .lean();

  return res._id.toString();
};

const buildSubmissionIdentityFilter = (
  reviewerType: 'Individual' | 'Team',
  reviewerId: string,
  isTA: boolean,
) => {
  if (isTA) {
    return { reviewerKind: 'TA', reviewerUserId: reviewerId };
  }
  if (reviewerType === 'Individual') {
    return { reviewerKind: 'Student', reviewerUserId: reviewerId };
  }
  return { reviewerKind: 'Team', reviewerTeamId: reviewerId };
};

const checkIsNotDuplicateSubmission = async (
  peerReviewId: string,
  peerReviewAssignmentId: string,
  reviewerType: 'Individual' | 'Team',
  reviewerId: string,
  isTA: boolean,
) => {
  const filter = buildSubmissionIdentityFilter(reviewerType, reviewerId, isTA);

  const existing = await PeerReviewSubmissionModel.findOne({
    peerReviewId,
    peerReviewAssignmentId,
    ...filter,
  }).lean();

  if (existing) {
    throw new BadRequestError('This reviewer is already assigned to this reviewee');
  }
};

const createSubmission = async (
  peerReviewId: string,
  peerReviewAssignmentId: string,
  reviewerType: 'Individual' | 'Team',
  reviewerId: string,
  isTA: boolean,
) => {
  const now = new Date();
  const base = {
    peerReviewId,
    peerReviewAssignmentId,
    status: 'NotStarted' as const,
    createdAt: now,
    updatedAt: now,
    scores: {},
  };

  if (isTA) {
    await PeerReviewSubmissionModel.create({
      ...base,
      reviewerKind: 'TA',
      reviewerUserId: reviewerId,
    });
    return;
  }

  if (reviewerType === 'Individual') {
    await PeerReviewSubmissionModel.create({
      ...base,
      reviewerKind: 'Student',
      reviewerUserId: reviewerId,
    });
    return;
  }

  await PeerReviewSubmissionModel.create({
    ...base,
    reviewerKind: 'Team',
    reviewerTeamId: reviewerId,
  });
};
