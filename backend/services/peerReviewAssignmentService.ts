import PeerReviewAssignmentModel, {
  PeerReviewAssignment,
} from '@models/PeerReviewAssignment';
import TeamModel from '@models/Team';
import { BadRequestError, NotFoundError } from './errors';
import { Types, ClientSession } from 'mongoose';
import { getPeerReviewById, getTeamDataById } from './peerReviewService';
import type { AnyBulkWriteOperation } from 'mongodb';
import { COURSE_ROLE } from '@shared/types/auth/CourseRole';
import { MissingAuthorizationError } from './errors';
import PeerReviewSubmissionModel from '@models/PeerReviewSubmission';
import PeerReviewCommentModel from '@models/PeerReviewComment';
import PeerReviewGradingTaskModel from '@models/PeerReviewGradingTask';
import { resolveTeamRepo } from './teamService';

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
  assignmentId: string,
  _courseId?: string
) => {
  const assignment =
    await PeerReviewAssignmentModel.findById(assignmentId).populate('reviewee');
  if (!assignment) throw new NotFoundError('Peer review assignment not found');

  // Faculty can access all assignments
  if (userCourseRole === COURSE_ROLE.Faculty) return assignment;

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
    const revieweeTeam = await TeamModel.findById(assignment.reviewee)
      .select('_id members teamSet')
      .lean();
    const isMember = (revieweeTeam!.members ?? []).map(String).includes(userId);
    if (revieweeTeam && isMember) return assignment;

    // Team-reviewer mode: student can access if their home team is assigned
    // as reviewer for this assignment (reviewerKind = Team)
    if (revieweeTeam?.teamSet) {
      const myTeam = await TeamModel.findOne({
        teamSet: revieweeTeam.teamSet,
        members: oid(userId),
      })
        .select('_id')
        .lean();

      if (myTeam) {
        const isTeamReviewer = await PeerReviewSubmissionModel.exists({
          peerReviewAssignmentId: oid(assignmentId),
          reviewerKind: 'Team',
          reviewerTeamId: myTeam._id,
        });

        if (isTeamReviewer) return assignment;
      }
    }
  }

  if (userCourseRole === COURSE_ROLE.TA) {
    // Check if TA is supervising the reviewee team
    const revieweeTeam = await TeamModel.findById(assignment.reviewee)
      .select('_id TA')
      .lean();
    if (revieweeTeam && revieweeTeam.TA?.toString() === userId)
      return assignment;
  }

  throw new MissingAuthorizationError(
    'You are not authorized to view this assignment'
  );
};

export const getPeerReviewAssignmentWithViewContext = async (
  userCourseRole: string,
  userId: string,
  assignmentId: string,
  courseId?: string
) => {
  const assignment = await getPeerReviewAssignmentById(
    userCourseRole,
    userId,
    assignmentId,
    courseId
  );

  const revieweeTeam = await TeamModel.findById(assignment.reviewee)
    .select('_id members TA')
    .lean();

  const isReviewee =
    userCourseRole === COURSE_ROLE.Student &&
    Boolean(revieweeTeam?.members?.map(String).includes(userId));

  const isSupervisorTA =
    userCourseRole === COURSE_ROLE.TA &&
    Boolean(revieweeTeam?.TA?.toString() === userId);

  return {
    assignment,
    viewContext: {
      isReviewee,
      isSupervisorTA,
    },
  };
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
    teamIdToRepoMap,
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
  const { repoName, repoUrl } = await resolveTeamRepo(courseId, revieweeId);

  const assignmentId = await ensureAssignmentForReviewee(
    peerReviewId,
    revieweeId,
    repoName,
    repoUrl
  );

  console.log('checking manual assignment duplicates...');
  // Check if duplicate assignment
  await checkIsNotDuplicateSubmission(
    peerReviewId,
    assignmentId,
    reviewerType,
    reviewerId,
    isTA
  );

  console.log('creating submission...');
  // Add reviewer to assignment (create new assignment if none exists)
  await createSubmission(
    peerReviewId,
    assignmentId,
    reviewerType,
    reviewerId,
    isTA
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

  const filter = buildSubmissionIdentityFilter(reviewerType, reviewerId, isTA);

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
  session: ClientSession | null
) => {
  const teamsQuery = TeamModel.find({
    teamSet: teamSetId,
  }).lean();

  if (session) teamsQuery.session(session);
  const prTeams = await teamsQuery;

  const prTeamDataById = await getTeamDataById(
    courseId,
    prTeams.map(t => t._id.toString())
  );

  const docs = prTeams.map(team => {
    const teamData = prTeamDataById.get(team._id.toString());
    return {
      peerReviewId,
      repoName: teamData?.repoName,
      repoUrl: teamData?.repoUrl,
      reviewee: team._id,
      deadline: null,
    };
  });

  if (docs.length > 0) {
    await PeerReviewAssignmentModel.insertMany(docs, { session });
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
  const teamIdToTeamMap = new Map(teams.map(t => [t.id, t]));
  const teamIdToTAMap = new Map(teams.map(t => [t.id, t.taId]));
  const teamIdToRepoMap = await getTeamDataById(courseId, prTeamIds);

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
          'Not enough eligible reviewees for TAs. ' +
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
  teamIdToRepoMap: Map<
    string,
    { repoUrl: string; repoName: string; gitHubOrgName: string }
  >,
  assignedStudentsForTeam: Map<string, Set<string>>,
  assignedTeamsForTeam: Map<string, Set<string>>,
  assignedTAsForTeam: Map<string, Set<string>>
) => {
  // 1. Ensure assignments exist for each reviewee team (and update repo info)
  const assignmentByReviewee = await upsertAndLoadAssignments(
    peerReviewId,
    prTeamIds,
    teamIdToRepoMap
  );

  // 2. Full reset of reviewer progress state before re-assignment
  //    - delete all previous comments
  //    - delete all previous grading tasks
  //    - delete all previous submissions
  await resetPeerReviewProgressData(peerReviewId);

  // 3. Create fresh blank submissions for the new assignment result
  await createFreshSubmissions(
    peerReviewId,
    reviewerType,
    taAssignmentsEnabled,
    assignDefault,
    assignTAs,
    prTeamIds,
    assignmentByReviewee,
    assignedStudentsForTeam,
    assignedTeamsForTeam,
    assignedTAsForTeam
  );

  // 4. Remove assignments (and their submissions) for teams no longer in prTeamIds
  await deleteStaleAssignmentsAndSubmissions(peerReviewId, prTeamIds);
};

const resetPeerReviewProgressData = async (peerReviewId: string) => {
  const peerReviewIdObj = oid(peerReviewId);

  await PeerReviewCommentModel.deleteMany({
    peerReviewId: peerReviewIdObj,
  });

  await PeerReviewGradingTaskModel.deleteMany({
    peerReviewId: peerReviewIdObj,
  });

  await PeerReviewSubmissionModel.deleteMany({
    peerReviewId: peerReviewIdObj,
  });
};

const createFreshSubmissions = async (
  peerReviewId: string,
  reviewerType: string,
  taAssignmentsEnabled: boolean,
  assignDefault: boolean,
  assignTAs: boolean,
  prTeamIds: string[],
  assignmentByReviewee: Map<string, PeerReviewAssignment>,
  assignedStudentsForTeam: Map<string, Set<string>>,
  assignedTeamsForTeam: Map<string, Set<string>>,
  assignedTAsForTeam: Map<string, Set<string>>
) => {
  const now = new Date();
  const docs: any[] = [];

  for (const reviewee of prTeamIds) {
    const assignment = assignmentByReviewee.get(reviewee);
    if (!assignment) continue;

    if (assignDefault) {
      if (reviewerType === 'Individual') {
        const students = Array.from(
          assignedStudentsForTeam.get(reviewee) ?? []
        );
        for (const reviewerUserId of students) {
          docs.push({
            peerReviewId: oid(peerReviewId),
            peerReviewAssignmentId: assignment._id,
            reviewerKind: 'Student',
            reviewerUserId: oid(reviewerUserId),
            status: 'NotStarted',
            createdAt: now,
            updatedAt: now,
            scores: {},
          });
        }
      } else if (reviewerType === 'Team') {
        const teams = Array.from(assignedTeamsForTeam.get(reviewee) ?? []);
        for (const reviewerTeamId of teams) {
          docs.push({
            peerReviewId: oid(peerReviewId),
            peerReviewAssignmentId: assignment._id,
            reviewerKind: 'Team',
            reviewerTeamId: oid(reviewerTeamId),
            status: 'NotStarted',
            createdAt: now,
            updatedAt: now,
            scores: {},
          });
        }
      }
    }

    if (taAssignmentsEnabled && assignTAs) {
      const tas = Array.from(assignedTAsForTeam.get(reviewee) ?? []);
      for (const reviewerUserId of tas) {
        docs.push({
          peerReviewId: oid(peerReviewId),
          peerReviewAssignmentId: assignment._id,
          reviewerKind: 'TA',
          reviewerUserId: oid(reviewerUserId),
          status: 'NotStarted',
          createdAt: now,
          updatedAt: now,
          scores: {},
        });
      }
    }
  }

  if (docs.length > 0) {
    await PeerReviewSubmissionModel.insertMany(docs, { ordered: true });
  }
};

const upsertAndLoadAssignments = async (
  peerReviewId: string,
  prTeamIds: string[],
  teamIdToRepoMap: Map<
    string,
    { repoUrl: string; repoName: string; gitHubOrgName: string }
  >
) => {
  const now = new Date();
  const ops: AnyBulkWriteOperation[] = prTeamIds.map(reviewee => {
    const teamData = teamIdToRepoMap.get(reviewee)!;
    const { repoName, repoUrl } = teamData;
    return {
      updateOne: {
        filter: { peerReviewId: oid(peerReviewId), reviewee: oid(reviewee) },
        update: {
          $set: { repoName, repoUrl, updatedAt: now },
          $setOnInsert: {
            peerReviewId: oid(peerReviewId),
            reviewee: oid(reviewee),
            createdAt: now,
          },
        },
        upsert: true,
      },
    };
  });

  if (ops.length > 0) {
    await PeerReviewAssignmentModel.bulkWrite(ops, { ordered: true });
  }

  const finalAssignments: PeerReviewAssignment[] =
    await PeerReviewAssignmentModel.find({
      peerReviewId: oid(peerReviewId),
      reviewee: { $in: prTeamIds.map(oid) },
    })
      .select('_id reviewee repoName repoUrl')
      .lean();

  const finalMap = new Map<string, PeerReviewAssignment>();
  for (const a of finalAssignments) {
    finalMap.set(a.reviewee.toString(), a);
  }
  return finalMap;
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
    eligibleReviewees!.sort((a, b) => load(a) - load(b));

    const next = eligibleReviewees!.find(teamId => {
      const assignedSet = assignedForTeamMap.get(teamId);
      return !assignedSet || !assignedSet.has(reviewerId);
    });

    assignedForTeamMap.get(next!)!.add(reviewerId);
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
  const filter =
    reviewerType === 'Individual'
      ? { reviewerKind: 'Student', reviewerUserId: oid(reviewerId) }
      : { reviewerKind: 'Team', reviewerTeamId: oid(reviewerId) };

  const currentAssignmentsCount =
    await PeerReviewSubmissionModel.countDocuments({
      peerReviewId: oid(peerReviewId),
      ...filter,
    });

  if (currentAssignmentsCount >= maxPerReviewer) {
    throw new BadRequestError(
      reviewerType === 'Individual'
        ? 'Reviewer has reached the maximum number of assigned reviews'
        : 'Reviewer team has reached the maximum number of assigned reviews'
    );
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
  isTA: boolean
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
  isTA: boolean
) => {
  const filter = buildSubmissionIdentityFilter(reviewerType, reviewerId, isTA);

  const existing = await PeerReviewSubmissionModel.findOne({
    peerReviewId,
    peerReviewAssignmentId,
    ...filter,
  }).lean();

  if (existing) {
    throw new BadRequestError(
      'This reviewer is already assigned to this reviewee'
    );
  }
};

const createSubmission = async (
  peerReviewId: string,
  peerReviewAssignmentId: string,
  reviewerType: 'Individual' | 'Team',
  reviewerId: string,
  isTA: boolean
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
