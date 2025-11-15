import PeerReviewAssignmentModel from '@models/PeerReviewAssignment';
import TeamModel, { Team } from '@models/Team';
import { BadRequestError, NotFoundError } from './errors';
import TeamDataModel, { TeamData } from '@models/TeamData';
import { Types } from 'mongoose';
import { getPeerReviewById, getTeamDataById } from './peerReviewService';
import type { AnyBulkWriteOperation } from 'mongodb';
import CourseRole from '@shared/types/auth/CourseRole';
import { MissingAuthorizationError } from './errors';

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

  // Check if user is the reviewer user or faculty level
  const isReviewerUser =
    assignment.studentReviewers.includes(oid(userId)) ||
    assignment.taReviewers.includes(oid(userId));
  if (isReviewerUser || userCourseRole === CourseRole.Faculty)
    return assignment;

  if (userCourseRole === CourseRole.Student) {
    // Check if student is part of the reviewer team
    const reviewerTeam = await TeamModel.findById(assignment.reviewee);
    if (reviewerTeam && reviewerTeam.members?.includes(oid(userId)))
      return assignment;

    // Check if student is part of the reviewee team
    const revieweeTeam = await TeamModel.findById(assignment.reviewee);
    if (revieweeTeam && revieweeTeam.members?.includes(oid(userId)))
      return assignment;
  }

  if (userCourseRole === CourseRole.TA) {
    // Check if TA is supervising the reviewee team
    const revieweeTeam = await TeamModel.findById(assignment.reviewee);
    if (revieweeTeam && revieweeTeam.TA! === oid(userId)) return assignment;
  }

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
  const taAssignmentsEnabled = peerReview.TaAssignments;
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

  // Get Eligible Reviewwes
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

  // Update database in one session; remove old assignments and add new ones
  await updateDBAssignments(
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

  console.log('isTA: ', isTA);
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

  console.log('checking manual assignment duplicates...');
  // Check if duplicate assignment
  await checkIsNotDuplicateAssignment(
    peerReviewId,
    revieweeId,
    reviewerId,
    reviewerType,
    isTA
  );

  // Get repo URL for the reviewee team
  const teamData = await TeamDataModel.findOne({
    course: courseId,
    teamId: reviewee.number,
  })
    .select('gitHubOrgName repoName')
    .lean();

  // TODO: Derive repo URL for this team, for now fix example in upsert function

  console.log('upserting manual assignment...');
  // Add reviewer to assignment (create new assignment if none exists)
  await upsertAssignment(
    peerReviewId,
    revieweeId,
    reviewerId,
    reviewerType,
    userId,
    teamData,
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
    ...(isTA
      ? { taReviewers: reviewerId }
      : reviewerType === 'Individual'
        ? { studentReviewers: reviewerId }
        : { teamReviewers: reviewerId }),
  })
    .select('_id studentReviewers teamReviewers taReviewers')
    .lean();
  if (!existingAssignment) {
    return; // Nothing to remove
  }

  const pull = isTA
    ? { $pull: { taReviewers: reviewerId } }
    : reviewerType === 'Individual'
      ? { $pull: { studentReviewers: reviewerId } }
      : { $pull: { teamReviewers: reviewerId } };

  await PeerReviewAssignmentModel.updateOne(
    { _id: existingAssignment._id },
    pull
  );
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
  });

  const prTeamDataById: Map<
    string,
    {
      gitHubOrgName: string;
      repoName: string;
      repoUrl: string;
    }
  > = await getTeamDataById(
    courseId,
    prTeams.map(t => t.number)
  );

  for (const team of prTeams) {
    console.log('Creating assignment for team:', team.number);
    const newAssignment = new PeerReviewAssignmentModel({
      peerReviewId: peerReviewId,
      repoName: prTeamDataById.get(team.number.toString())?.repoName || '',
      repoUrl: 'https://github.com/gongg21/AddSubtract.git', // DEFAULT URL FOR NOW
      reviewee: team._id,
      studentReviewers: [],
      teamReviewers: [],
      taReviewers: [],
      assignedBy: userId,
      assignedAt: new Date(),
      status: 'Pending',
    });
    await newAssignment.save();
  }
  console.log('Initialised assignments for team set:', teamSetId);
  return;
};

// Delete all assignments for a given peer review ID
export const deleteAssignmentsByPeerReviewId = async (peerReviewId: string) => {
  return await PeerReviewAssignmentModel.deleteMany({
    peerReviewId,
  });
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

const updateDBAssignments = async (
  peerReviewId: string,
  userId: string,
  reviewerType: string,
  taAssignmentsEnabled: boolean,
  assignDefault: boolean,
  assignTAs: boolean,
  prTeamIds: string[],
  getTeamRepo: (teamId: string) => {
    repoUrl: string;
    repoName: string;
    gitHubOrgName: string;
  },
  assignedStudentsForTeam: Map<string, Set<string>>,
  assignedTeamsForTeam: Map<string, Set<string>>,
  assignedTAsForTeam: Map<string, Set<string>>
) => {
  console.log('session starting, updating DB assignments...');

  const existingAssignments = await PeerReviewAssignmentModel.find({
    peerReviewId: peerReviewId,
    reviewee: { $in: prTeamIds.map(oid) },
  })
    .select('_id reviewee studentReviewers teamReviewers taReviewers')
    .lean();

  const revieweeToAssignmentMap = new Map<
    string,
    (typeof existingAssignments)[number]
  >();
  for (const a of existingAssignments) {
    revieweeToAssignmentMap.set(a.reviewee.toString(), a);
  }

  const newAssignments: AnyBulkWriteOperation[] = prTeamIds.map(revieweeId => {
    const { repoUrl, repoName } = getTeamRepo(revieweeId);
    const prev = revieweeToAssignmentMap.get(revieweeId);

    const studentIds = Array.from(
      assignedStudentsForTeam.get(revieweeId) ?? []
    ).map(oid);
    const teamIds = Array.from(assignedTeamsForTeam.get(revieweeId) ?? []).map(
      oid
    );
    const taIds = Array.from(assignedTAsForTeam.get(revieweeId) ?? []).map(oid);

    const studentReviewers =
      reviewerType === 'Individual'
        ? assignDefault
          ? studentIds
          : prev?.studentReviewers ?? []
        : [];

    const teamReviewers =
      reviewerType === 'Team'
        ? assignDefault
          ? teamIds
          : prev?.teamReviewers ?? []
        : [];

    const taReviewers = taAssignmentsEnabled
      ? assignTAs
        ? taIds
        : prev?.taReviewers ?? []
      : [];

    const peerReviewIdObj = oid(peerReviewId);
    const revieweeIdObj = oid(revieweeId);

    return {
      replaceOne: {
        filter: { peerReviewId: peerReviewIdObj, reviewee: revieweeIdObj },
        replacement: {
          peerReviewId: peerReviewIdObj,
          repoName,
          repoUrl,
          studentReviewers,
          teamReviewers,
          taReviewers,
          reviewee: revieweeIdObj,
          assignedBy: oid(userId),
          assignedAt: new Date(),
          status: 'Pending' as const,
        },
        upsert: true,
      },
    };
  });

  await PeerReviewAssignmentModel.deleteMany({
    peerReviewId: peerReviewId,
    reviewee: { $nin: prTeamIds.map(oid) },
  });

  if (newAssignments.length > 0) {
    await PeerReviewAssignmentModel.bulkWrite(newAssignments, {
      ordered: true,
    });
  }
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

const checkIsNotDuplicateAssignment = async (
  peerReviewId: string,
  revieweeId: string,
  reviewerId: string,
  reviewerType: 'Individual' | 'Team',
  isTA: boolean
) => {
  const existingAssignment = await PeerReviewAssignmentModel.findOne({
    peerReviewId,
    reviewee: revieweeId,
    ...(isTA
      ? { taReviewers: reviewerId }
      : reviewerType === 'Individual'
        ? { studentReviewers: reviewerId }
        : { teamReviewers: reviewerId }),
  }).lean();
  if (existingAssignment) {
    throw new BadRequestError(
      'This reviewer is already assigned to this reviewee'
    );
  }
};

const upsertAssignment = async (
  peerReviewId: string,
  revieweeId: string,
  reviewerId: string,
  reviewerType: 'Individual' | 'Team',
  userId: string,
  teamData: { repoName: string } | null,
  isTa: boolean
) => {
  const add = isTa
    ? { $addToSet: { taReviewers: oid(reviewerId) } }
    : reviewerType === 'Individual'
      ? { $addToSet: { studentReviewers: oid(reviewerId) } }
      : { $addToSet: { teamReviewers: oid(reviewerId) } };

  await PeerReviewAssignmentModel.updateOne(
    { peerReviewId, reviewee: oid(revieweeId) },
    {
      ...add,
      $setOnInsert: {
        peerReviewId,
        reviewee: oid(revieweeId),
        repoName: teamData ? teamData.repoName || '' : '',
        repoUrl: 'https://github.com/gongg21/AddSubtract.git',
        assignedBy: oid(userId),
        assignedAt: new Date(),
        status: 'Pending' as const,
      },
    },
    { upsert: true }
  );
};
