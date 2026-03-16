import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { ConnectOptions, Types } from 'mongoose';

import CourseModel from '../../models/Course';
import TeamSetModel from '../../models/TeamSet';
import TeamModel from '../../models/Team';
import UserModel from '../../models/User';
import TeamDataModel from '../../models/TeamData';

import PeerReviewModel from '../../models/PeerReview';
import PeerReviewAssignmentModel from '../../models/PeerReviewAssignment';
import PeerReviewCommentModel from '../../models/PeerReviewComment';
import PeerReviewSubmissionModel from '../../models/PeerReviewSubmission';
import { PeerReviewGradingTaskModel } from '../../models/PeerReviewGradingTask';

import {
  getAllPeerReviewsyId,
  getPeerReviewById,
  getPeerReviewInfoById,
  getPeerReviewProgressOverviewById,
  createPeerReviewById,
  deletePeerReviewById,
  updatePeerReviewById,
  getTeamDataById,
  __testables,
} from '../../services/peerReviewService';

import { COURSE_ROLE } from '@shared/types/auth/CourseRole';
import { NotFoundError } from '../../services/errors';

// mock dependent services
import {
  initialiseAssignments,
  deleteAssignmentsByPeerReviewId,
} from '../../services/peerReviewAssignmentService';

import { resolveTeamRepo } from '../../services/teamService';

jest.mock('../../services/peerReviewAssignmentService', () => ({
  __esModule: true,
  initialiseAssignments: jest.fn(),
  deleteAssignmentsByPeerReviewId: jest.fn(),
}));

jest.mock('../../services/teamService', () => ({
  __esModule: true,
  resolveTeamRepo: jest.fn(),
}));

let mongoServer: MongoMemoryServer;

const oid = () => new Types.ObjectId();
const oidStr = () => new Types.ObjectId().toString();

let testCourseId: Types.ObjectId;
let testTeamSetId: Types.ObjectId;

const makeCourse = async () =>
  new CourseModel({
    name: 'Test Course',
    code: 'TEST1234',
    semester: 'Spring 2026',
    startDate: new Date('2026-01-01'),
    courseType: 'Normal',
  }).save();

const makeTeamSet = async (courseId: Types.ObjectId) =>
  new TeamSetModel({ name: 'Test TeamSet', course: courseId }).save();

const ensureUser = async (id: Types.ObjectId, name: string) => {
  await UserModel.updateOne(
    { _id: id },
    { $setOnInsert: { _id: id, name, identifier: `id-${id.toString()}` } },
    { upsert: true }
  );
};

const makeTeam = async (overrides: Partial<any> = {}) =>
  new TeamModel({
    teamSet: testTeamSetId,
    name: `T-${Math.random().toString(16).slice(2, 8)}`,
    number: overrides.number ?? Math.floor(Math.random() * 1000) + 1,
    members: overrides.members ?? [],
    TA: overrides.TA,
    ...overrides,
  }).save();

const makeTeamData = async (
  teamIdNum: number,
  overrides: Partial<any> = {}
) => {
  return new TeamDataModel({
    teamId: teamIdNum,
    course: testCourseId,
    gitHubOrgName: 'OrgFromDB',
    repoName: `Repo-${teamIdNum}`,
    commits: 0,
    weeklyCommits: [[0]],
    issues: 0,
    pullRequests: 0,
    updatedIssues: [],
    teamContributions: new Map([
      [
        'alice',
        {
          commits: 0,
          createdIssues: 0,
          openIssues: 0,
          closedIssues: 0,
          pullRequests: 0,
          codeReviews: 0,
          comments: 0,
        },
      ],
    ]),
    teamPRs: [],
    milestones: [],
    ...overrides,
  }).save();
};

const makePeerReview = async (overrides: Partial<any> = {}) => {
  const now = Date.now();
  return new PeerReviewModel({
    course: testCourseId,
    teamSetId: testTeamSetId,
    internalAssessmentId: oid(),
    title: 'PR',
    description: 'desc',
    startDate: new Date(now - 60_000),
    endDate: new Date(now + 60_000),
    reviewerType: 'Individual',
    taAssignments: false,
    minReviewsPerReviewer: 1,
    maxReviewsPerReviewer: 2,
    status: 'Active',
    ...overrides,
  }).save();
};

const makeAssignment = async (
  prId: Types.ObjectId,
  revieweeTeamId: Types.ObjectId,
  overrides: Partial<any> = {}
) =>
  new PeerReviewAssignmentModel({
    peerReviewId: prId,
    reviewee: revieweeTeamId,
    repoName: 'Repo',
    repoUrl: 'http://example.com/repo.git',
    ...overrides,
  }).save();

const makeSubmission = async (
  prId: Types.ObjectId,
  assignmentId: Types.ObjectId,
  overrides: Partial<any> = {}
) => {
  const reviewerKind = overrides.reviewerKind ?? 'Student';

  const base: any = {
    peerReviewId: prId,
    peerReviewAssignmentId: assignmentId,
    status: overrides.status ?? 'Draft',
    reviewerKind,
    overallComment: overrides.overallComment,
    totalScore: overrides.totalScore,
    startedAt: overrides.startedAt,
    lastEditedAt: overrides.lastEditedAt,
    submittedAt: overrides.submittedAt,
  };

  if (reviewerKind === 'Student' || reviewerKind === 'TA') {
    base.reviewerUserId = overrides.reviewerUserId ?? oid();
  }
  if (reviewerKind === 'Team') {
    base.reviewerTeamId = overrides.reviewerTeamId ?? oid();
  }

  return new PeerReviewSubmissionModel({ ...base, ...overrides }).save();
};

const makeComment = async (assignmentId: Types.ObjectId) =>
  new PeerReviewCommentModel({
    peerReviewId: oid(),
    peerReviewAssignmentId: assignmentId,
    createdAt: new Date(),
    filePath: 'a.ts',
    startLine: 1,
    endLine: 1,
    comment: 'hello',
    author: oid(),
    authorCourseRole: COURSE_ROLE.Student,
  }).save();

const makeGradingTask = async (
  prId: Types.ObjectId,
  submissionId: Types.ObjectId,
  status: 'Assigned' | 'InProgress' | 'Completed' = 'Assigned'
) =>
  new PeerReviewGradingTaskModel({
    peerReviewId: prId,
    peerReviewSubmissionId: submissionId,
    grader: oid(),
    status,
  }).save();

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as ConnectOptions);
});

beforeEach(async () => {
  jest.clearAllMocks();

  await PeerReviewCommentModel.deleteMany({});
  await PeerReviewSubmissionModel.deleteMany({});
  await PeerReviewAssignmentModel.deleteMany({});
  await PeerReviewModel.deleteMany({});
  await PeerReviewGradingTaskModel.deleteMany({});
  await TeamDataModel.deleteMany({});
  await TeamModel.deleteMany({});
  await UserModel.deleteMany({});
  await TeamSetModel.deleteMany({});
  await CourseModel.deleteMany({});

  const course = await makeCourse();
  const teamSet = await makeTeamSet(course._id);
  testCourseId = course._id;
  testTeamSetId = teamSet._id;

  // default resolveTeamRepo
  (resolveTeamRepo as jest.Mock).mockResolvedValue({
    repoName: 'TeamRepo',
    repoUrl: 'http://example.com/example.git',
    gitHubOrgName: 'org',
  });

  // default assignment service
  (initialiseAssignments as jest.Mock).mockResolvedValue(undefined);
  (deleteAssignmentsByPeerReviewId as jest.Mock).mockResolvedValue({
    deletedCount: 0,
  });

  // mock startSession to avoid transaction requirement
  jest.spyOn(mongoose, 'startSession').mockResolvedValue({
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn(),
  } as any);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('peerReviewService', () => {
  describe('getAllPeerReviewsyId', () => {
    it('returns empty array when no peer reviews (covers map on empty)', async () => {
      const res = await getAllPeerReviewsyId(testCourseId.toString());
      expect(res).toEqual([]);
    });

    it('uses computedStatus when present, otherwise status', async () => {
      // create 2 PRs so mapping runs twice
      const pr1 = await makePeerReview({ status: 'Active' });
      const pr2 = await makePeerReview({ status: 'Upcoming' });

      const res = await getAllPeerReviewsyId(testCourseId.toString());
      expect(res).toHaveLength(2);
      expect(res.map(r => r._id.toString())).toEqual(
        expect.arrayContaining([pr1._id.toString(), pr2._id.toString()])
      );
      // at least ensure status exists after override line runs
      expect(res[0].status).toBeDefined();
    });
  });

  describe('getPeerReviewInfoById', () => {
    it('Student: no team in teamset -> returns emptyPeerReviewInfo', async () => {
      const studentId = oid();
      await ensureUser(studentId, 'S');

      const pr = await makePeerReview({
        reviewerType: 'Individual',
        taAssignments: true,
      });

      const info = await getPeerReviewInfoById(
        studentId.toString(),
        COURSE_ROLE.Student,
        testCourseId.toString(),
        pr._id.toString()
      );

      expect(info._id).toBe(pr._id.toString());
      expect(info.teams).toHaveLength(0);
      expect(info.assignmentsOfTeam).toEqual({});
      expect(info.TAAssignments).toEqual({});
      expect(info.capabilities.assignmentPageTeamIds).toEqual([]);
    });

    it('TA: filterByTA yields no teams -> returns emptyPeerReviewInfo', async () => {
      const taId = oid();
      await ensureUser(taId, 'TA');

      const pr = await makePeerReview({
        reviewerType: 'Individual',
        taAssignments: true,
      });

      const info = await getPeerReviewInfoById(
        taId.toString(),
        COURSE_ROLE.TA,
        testCourseId.toString(),
        pr._id.toString()
      );

      expect(info._id).toBe(pr._id.toString());
      expect(info.teams).toHaveLength(0);
      expect(info.capabilities.assignmentPageTeamIds).toEqual([]);
    });

    it('Student in team: builds DTO; does NOT populate assignmentsOfTeam reviewers because student role', async () => {
      const studentId = oid();
      const taId = oid();
      await ensureUser(studentId, 'Student');
      await ensureUser(taId, 'TA');

      const pr = await makePeerReview({
        reviewerType: 'Individual',
        taAssignments: true,
      });

      // student is in team -> scopedTeams non-empty
      const team = await makeTeam({
        number: 10,
        members: [studentId],
        TA: taId,
      });
      await makeTeamData(10);

      // assignment for that reviewee team
      const a = await makeAssignment(pr._id, team._id, { deadline: undefined });

      // student submission exists, so assignedReviews should appear on the student member
      await makeSubmission(pr._id, a._id, {
        reviewerKind: 'Student',
        reviewerUserId: studentId,
        status: 'Draft',
      });

      const info = await getPeerReviewInfoById(
        studentId.toString(),
        COURSE_ROLE.Student,
        testCourseId.toString(),
        pr._id.toString()
      );

      expect(info.teams).toHaveLength(1);
      const dtoTeam = info.teams[0];
      expect(dtoTeam.teamId).toBe(team._id.toString());

      // since student role, we should NOT have populated reviewers list (it stays empty arrays)
      const entry = info.assignmentsOfTeam[team._id.toString()];
      expect(entry).toBeTruthy();
      expect(entry.reviewers.students).toEqual([]);
      expect(entry.reviewers.teams).toEqual([]);
      expect(entry.reviewers.TAs).toEqual([]);

      // assignedReviews should exist on member
      expect(dtoTeam.members).toHaveLength(1);
      expect(dtoTeam.members[0].assignedReviews.length).toBe(1);

      // student never gets TA assignments even if enabled
      expect(Object.keys(info.TAAssignments)).toHaveLength(0);
    });

    it('Faculty: covers loadAssignmentsState fallbacks, addMissingAssignmentsForSubmissions, and reviewer population', async () => {
      const s1 = oid();
      const s2 = oid();
      const ta1 = oid();
      const ta2 = oid();
      await ensureUser(s1, 'S1');
      await ensureUser(s2, 'S2');
      await ensureUser(ta1, 'TA1');
      await ensureUser(ta2, 'TA2');

      // Make PR with taAssignments enabled so Faculty taIdsWanted path runs
      const pr = await makePeerReview({
        reviewerType: 'Individual',
        taAssignments: true,
      });

      // Two teams; both have different TAs to exercise filter(Boolean) in Faculty taIdsWanted path
      const teamA = await makeTeam({ number: 1, members: [s1], TA: ta1 });
      const teamB = await makeTeam({ number: 2, members: [s2], TA: ta2 });

      await makeTeamData(1);
      await makeTeamData(2);

      // assignments for both reviewees
      const aA = await makeAssignment(pr._id, teamA._id);
      const aB = await makeAssignment(pr._id, teamB._id);

      // force resolveTeamRepo to return nulls once -> fallback to TeamRepo/TEMP_FALLBACK_URL lines
      (resolveTeamRepo as jest.Mock)
        .mockResolvedValueOnce({
          repoName: null,
          repoUrl: null,
          gitHubOrgName: null,
        })
        .mockResolvedValueOnce({
          repoName: 'B',
          repoUrl: 'http://b.git',
          gitHubOrgName: 'orgB',
        });

      // a normal student submission on assignment A
      await makeSubmission(pr._id, aA._id, {
        reviewerKind: 'Student',
        reviewerUserId: s1,
        status: 'Draft',
      });

      // --- FORCE addMissingAssignmentsForSubmissions + toAssignedReviewDTO null branch ---
      // create an extra assignment doc that will be "missing" from assignmentById, AND its reviewee team is missing,
      // so addMissingAssignmentsForSubmissions will fetch it but then continue (reviewee not found)
      const orphanTeamId = oid(); // never created
      const orphanAssignment = await makeAssignment(pr._id, orphanTeamId);

      // now create a submission that references this orphan assignment
      await makeSubmission(pr._id, orphanAssignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: s2,
        status: 'Draft',
      });

      // TA submission to include taSubs path (Faculty wants all TA ids in scope)
      await makeSubmission(pr._id, aB._id, {
        reviewerKind: 'TA',
        reviewerUserId: ta1,
        status: 'Draft',
      });

      const info = await getPeerReviewInfoById(
        oidStr(),
        COURSE_ROLE.Faculty,
        testCourseId.toString(),
        pr._id.toString()
      );

      // core expectations
      expect(info.teams).toHaveLength(2);
      expect(Object.keys(info.assignmentsOfTeam)).toHaveLength(2); // orphan assignment should NOT create entry

      // reviewers populated for Faculty (non-student)
      const entryA = info.assignmentsOfTeam[teamA._id.toString()];
      expect(entryA.reviewers.students.length).toBeGreaterThanOrEqual(1);

      // TA assignments should exist (taAssignments enabled + Faculty path)
      expect(Object.keys(info.TAAssignments)).toContain(ta1.toString());
      expect(info.TAAssignments[ta1.toString()].taName).toBe('TA1');

      // verify loadAssignmentsState fallback lines executed at least once
      const dtoA = entryA.assignment;
      expect(dtoA.repoName).toBeTruthy();
      expect(dtoA.repoUrl).toBeTruthy();
    });

    it('Faculty: covers loadAssignmentsState "reviewee missing -> continue" and "assignmentDocs empty"', async () => {
      const s1 = oid();
      const ta1 = oid();
      await ensureUser(s1, 'S1');
      await ensureUser(ta1, 'TA1');

      const pr = await makePeerReview({
        reviewerType: 'Individual',
        taAssignments: false,
      });

      const teamA = await makeTeam({ number: 7, members: [s1], TA: ta1 });
      await makeTeamData(7);

      // create assignment doc then delete team so TeamModel.findById returns null -> continue branch
      const a = await makeAssignment(pr._id, teamA._id);
      await TeamModel.deleteOne({ _id: teamA._id });

      const info = await getPeerReviewInfoById(
        oidStr(),
        COURSE_ROLE.Faculty,
        testCourseId.toString(),
        pr._id.toString()
      );

      // since assignmentDocs matched (by reviewee id), but reviewee missing => continue, so assignmentsOfTeam becomes empty
      expect(Object.keys(info.assignmentsOfTeam)).toHaveLength(0);
    });

    it('covers addMissingAssignmentsForSubmissions: adds missing assignment into assignmentById via extra loop', async () => {
      const s1 = oid();
      const ta1 = oid();
      await ensureUser(s1, 'Student 1');
      await ensureUser(ta1, 'TA 1');

      // Peer review - Individual reviewerType so we load student submissions
      const pr = await makePeerReview({
        reviewerType: 'Individual',
        taAssignments: false,
      });

      // TeamSet teams
      // Team A will be in scope (we will call as student s1, so scope => only their team)
      const teamA = await makeTeam({ number: 1, members: [s1], TA: ta1 });

      // Team B exists but will NOT be in scopedTeamIds for student s1
      const teamB = await makeTeam({ number: 2, members: [oid()], TA: ta1 });

      // Need TeamData to satisfy getTeamDataById path (or you can just avoid relying on it)
      await makeTeamData(1);
      await makeTeamData(2);

      // Create assignment for Team A (in-scope)
      await makeAssignment(pr._id, teamA._id);

      // Create an assignment for Team B (out-of-scope), but DO NOT include it in loadAssignmentsState query
      // loadAssignmentsState only fetches assignments where reviewee in scopedTeamIds (Team A only)
      const missingAssignment = await makeAssignment(pr._id, teamB._id);

      // Create a Student submission that references the *missingAssignment*
      // This ensures addMissingAssignmentsForSubmissions sees an assignmentId in submissions that isn't in assignmentById
      await makeSubmission(pr._id, missingAssignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: s1,
        status: 'Draft',
      });

      // resolveTeamRepo should succeed
      (resolveTeamRepo as jest.Mock).mockResolvedValue({
        repoName: 'RepoX',
        repoUrl: 'http://example.com/x.git',
        gitHubOrgName: 'OrgX',
      });

      // Act as student s1 so scopedTeams = [teamA] only
      const info = await getPeerReviewInfoById(
        s1.toString(),
        COURSE_ROLE.Student,
        testCourseId.toString(),
        pr._id.toString()
      );

      // Since student, assignmentsOfTeam initially only has Team A.
      // BUT addMissingAssignmentsForSubmissions should add Team B assignment to assignmentById,
      // which then allows assignedReviews to be built; we can assert teamB assignment exists in map
      // by checking that assignedReviews for s1 includes an assignment whose reviewee is teamB.
      const teamAEntry = info.teams.find(
        t => t.teamId === teamA._id.toString()
      );
      expect(teamAEntry).toBeTruthy();

      // Student DTO includes members with assignedReviews. s1 is a member of teamA.
      const member = teamAEntry!.members.find(m => m.userId === s1.toString());
      expect(member).toBeTruthy();

      // This assigned review should exist even though the assignment was missing from initial assignmentById.
      // If the line `assignmentById.set(...)` ran, the DTO can be produced.
      expect(member!.assignedReviews.length).toBeGreaterThanOrEqual(1);

      // Assert that the assigned review's assignment is the missing assignment for teamB
      const assigned = member!.assignedReviews.find(ar => ar.submissionId);
      expect(assigned).toBeTruthy();
      expect(assigned!.assignment._id).toBe(missingAssignment._id.toString());
      expect(assigned!.assignment.reviewee._id).toBe(teamB._id.toString());
    });
  });

  describe('createPeerReviewById', () => {
    it('creates peer review and initialises assignments', async () => {
      const pr = await createPeerReviewById(testCourseId.toString(), {
        assessmentName: 'A1',
        description: 'Desc',
        startDate: new Date(Date.now() + 60_000),
        endDate: new Date(Date.now() + 120_000),
        teamSetId: testTeamSetId.toString(),
        internalAssessmentId: oidStr(),
        reviewerType: 'Individual',
        taAssignments: false,
        minReviews: 1,
        maxReviews: 2,
      }, null as any);

      expect(pr._id).toBeDefined();
      expect(initialiseAssignments).toHaveBeenCalledWith(
        testCourseId.toString(),
        pr._id.toString(),
        testTeamSetId.toString(),
        null
      );
    });

    it('throws NotFound when course missing', async () => {
      await expect(
        createPeerReviewById(oidStr(), {
          assessmentName: 'A1',
          description: 'Desc',
          startDate: new Date(),
          endDate: new Date(Date.now() + 60_000),
          teamSetId: testTeamSetId.toString(),
          internalAssessmentId: oidStr(),
          reviewerType: 'Individual',
          taAssignments: false,
          minReviews: 1,
          maxReviews: 2,
        }, null as any)
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('updatePeerReviewById', () => {
    it('updates peer review and reinitialises assignments when teamSetId provided', async () => {
      const pr = await makePeerReview({
        title: 'Old',
        teamSetId: testTeamSetId,
      });

      const updated = await updatePeerReviewById(pr._id.toString(), {
        assessmentName: 'New Title',
        teamSetId: testTeamSetId.toString(),
        taAssignments: true,
      } as any);

      expect(updated.title).toBe('New Title');
      expect(deleteAssignmentsByPeerReviewId).toHaveBeenCalledWith(
        pr._id.toString()
      );
      expect(initialiseAssignments).toHaveBeenCalledWith(
        testCourseId.toString(),
        pr._id.toString(),
        testTeamSetId.toString(),
        null
      );
    });

    it('updates grading windows when dates are provided', async () => {
      const pr = await makePeerReview({
        gradingStartDate: undefined,
        gradingEndDate: undefined,
      });
      const gradingStartDate = new Date('2026-02-01T00:00:00.000Z');
      const gradingEndDate = new Date('2026-02-15T00:00:00.000Z');

      const updated = await updatePeerReviewById(pr._id.toString(), {
        gradingStartDate,
        gradingEndDate,
      } as any);

      expect(updated.gradingStartDate?.toISOString()).toBe(
        gradingStartDate.toISOString()
      );
      expect(updated.gradingEndDate?.toISOString()).toBe(
        gradingEndDate.toISOString()
      );
    });

    it('updates description, review window, reviewerType and review limits', async () => {
      const pr = await makePeerReview({
        description: 'old description',
        reviewerType: 'Individual',
        minReviewsPerReviewer: 1,
        maxReviewsPerReviewer: 2,
      });

      const newStart = new Date('2026-04-01T00:00:00.000Z');
      const newEnd = new Date('2026-04-30T00:00:00.000Z');

      const updated = await updatePeerReviewById(pr._id.toString(), {
        description: 'new description',
        startDate: newStart,
        endDate: newEnd,
        reviewerType: 'Team',
        minReviews: 3,
        maxReviews: 5,
      } as any);

      expect(updated.description).toBe('new description');
      expect(updated.startDate.toISOString()).toBe(newStart.toISOString());
      expect(updated.endDate.toISOString()).toBe(newEnd.toISOString());
      expect(updated.reviewerType).toBe('Team');
      expect(updated.minReviewsPerReviewer).toBe(3);
      expect(updated.maxReviewsPerReviewer).toBe(5);
      expect(deleteAssignmentsByPeerReviewId).toHaveBeenCalledWith(
        pr._id.toString()
      );
      expect(initialiseAssignments).toHaveBeenCalledWith(
        testCourseId.toString(),
        pr._id.toString(),
        pr.teamSetId.toString(),
        null
      );
    });

    it('clears grading windows when null values are provided', async () => {
      const pr = await makePeerReview({
        gradingStartDate: new Date('2026-03-01T00:00:00.000Z'),
        gradingEndDate: new Date('2026-03-15T00:00:00.000Z'),
      });

      const updated = await updatePeerReviewById(pr._id.toString(), {
        gradingStartDate: null,
        gradingEndDate: null,
      } as any);

      expect(updated.gradingStartDate).toBeUndefined();
      expect(updated.gradingEndDate).toBeUndefined();
      expect(deleteAssignmentsByPeerReviewId).not.toHaveBeenCalled();
      expect(initialiseAssignments).not.toHaveBeenCalled();
    });

    it('updates peer review without resetting assignments when only title changes', async () => {
      const pr = await makePeerReview({ title: 'Old' });

      const updated = await updatePeerReviewById(pr._id.toString(), {
        assessmentName: 'New Title',
      } as any);

      expect(updated.title).toBe('New Title');
      expect(deleteAssignmentsByPeerReviewId).not.toHaveBeenCalled();
      expect(initialiseAssignments).not.toHaveBeenCalled();
    });

    it('throws NotFound when peer review missing', async () => {
      await expect(
        updatePeerReviewById(oidStr(), { assessmentName: 'x' } as any)
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('deletePeerReviewById', () => {
    it('deletes peer review + assignments + comments (happy path)', async () => {
      const pr = await makePeerReview();

      const revieweeA = await makeTeam({ number: 1 });
      const revieweeB = await makeTeam({ number: 2 });

      const a1 = await makeAssignment(pr._id, revieweeA._id);
      const a2 = await makeAssignment(pr._id, revieweeB._id);

      await makeComment(a1._id);
      await makeComment(a1._id);
      await makeComment(a2._id);

      (deleteAssignmentsByPeerReviewId as jest.Mock).mockResolvedValue({
        deletedCount: 2,
      });

      const res = await deletePeerReviewById(pr._id.toString());

      expect(res.deletedPeerReviewId).toBe(pr._id.toString());
      expect(res.deleted.comments).toBe(3);
      expect(res.deleted.assignments).toBe(2);
      expect(res.deleted.peerReview).toBe(1);
    });

    it('uses 0 when delCommentsRes.deletedCount is undefined', async () => {
      const pr = await makePeerReview();
      const teamA = await makeTeam({ number: 1 });

      const a = await makeAssignment(pr._id, teamA._id);

      // force deleteMany to return no deletedCount
      const delSpy = jest
        .spyOn(PeerReviewCommentModel, 'deleteMany')
        .mockResolvedValueOnce({} as any);
      (deleteAssignmentsByPeerReviewId as jest.Mock).mockResolvedValueOnce({
        deletedCount: undefined,
      });

      const res = await deletePeerReviewById(pr._id.toString());
      expect(res.deleted.comments).toBe(0);
      expect(res.deleted.assignments).toBe(0);

      delSpy.mockRestore();
    });

    it('throws NotFound when peer review missing and aborts transaction', async () => {
      const session = await mongoose.startSession();
      const abortSpy = jest.spyOn(session as any, 'abortTransaction');

      await expect(deletePeerReviewById(oidStr())).rejects.toBeInstanceOf(
        NotFoundError
      );
      expect(abortSpy).toHaveBeenCalled();
    });

    it('throws NotFound when deletion returns null (covers branch) and aborts', async () => {
      const pr = await makePeerReview();

      const spy = jest
        .spyOn(PeerReviewModel, 'findByIdAndDelete')
        .mockResolvedValueOnce(null as any);

      const session = await mongoose.startSession();
      const abortSpy = jest.spyOn(session as any, 'abortTransaction');

      await expect(
        deletePeerReviewById(pr._id.toString())
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(abortSpy).toHaveBeenCalled();

      spy.mockRestore();
    });
  });

  describe('getTeamDataById', () => {
    it('success path but uses ?? fallbacks when resolveTeamRepo returns nullish values', async () => {
      await makeTeamData(99);

      (resolveTeamRepo as jest.Mock).mockResolvedValueOnce({
        repoName: 'team101',
        repoUrl: 'http://example.com/team101.git',
        gitHubOrgName: null,
      });

      const map = await getTeamDataById(testCourseId.toString(), ['99']);

      expect(map.get('99')?.repoName).toBe('team101');
      expect(map.get('99')?.repoUrl).toBeTruthy();
    });

    it('returns repo mapping from TeamData + resolveTeamRepo success', async () => {
      await makeTeamData(10);

      (resolveTeamRepo as jest.Mock).mockResolvedValue({
        repoName: 'Repo10',
        repoUrl: 'http://example.com/10.git',
        gitHubOrgName: 'Org10',
      });

      const map = await getTeamDataById(testCourseId.toString(), ['10']);

      expect(map.get('10')?.repoName).toBe('Repo10');
      expect(map.get('10')?.repoUrl).toContain('10.git');
      expect(map.get('1')).toBeUndefined(); // no fallback
    });

    it('throws when resolveTeamRepo throws', async () => {
      await makeTeamData(11);

      (resolveTeamRepo as jest.Mock).mockImplementation(async () => {
        throw new Error('boom');
      });

      await expect(
        getTeamDataById(testCourseId.toString(), ['11'])
      ).rejects.toThrow('boom');
    });
  });

  describe('getPeerReviewInfoById', () => {
    it('returns empty info when ctx.scopedTeams is empty (student not in any team)', async () => {
      const studentId = oid();
      await ensureUser(studentId, 'S');

      const pr = await makePeerReview({
        reviewerType: 'Individual',
        taAssignments: false,
      });

      const info = await getPeerReviewInfoById(
        studentId.toString(),
        COURSE_ROLE.Student,
        testCourseId.toString(),
        pr._id.toString()
      );

      expect(info._id).toBe(pr._id.toString());
      expect(info.teams).toHaveLength(0);
      expect(Object.keys(info.assignmentsOfTeam)).toHaveLength(0);
    });

    it('faculty: builds non-empty DTO, populates assignmentsOfTeam reviewers, includes TA assignments when enabled', async () => {
      // users
      const s1 = oid();
      const s2 = oid();
      const ta1 = oid();
      await ensureUser(s1, 'Student 1');
      await ensureUser(s2, 'Student 2');
      await ensureUser(ta1, 'TA 1');

      const pr = await makePeerReview({
        reviewerType: 'Individual',
        taAssignments: true,
      });

      // teams in teamSet
      const teamA = await makeTeam({ number: 1, members: [s1], TA: ta1 });
      const teamB = await makeTeam({ number: 2, members: [s2], TA: ta1 });

      // team data docs (so getTeamDataById reads them)
      await makeTeamData(1);
      await makeTeamData(2);

      // assignments for reviewee teams
      const aA = await makeAssignment(pr._id, teamA._id);
      const aB = await makeAssignment(pr._id, teamB._id);

      // student submission (reviewer is s1)
      await makeSubmission(pr._id, aA._id, {
        reviewerKind: 'Student',
        reviewerUserId: s1,
        status: 'Draft',
      });

      // TA submission (reviewer is ta1) to hit TA subs path
      await makeSubmission(pr._id, aB._id, {
        reviewerKind: 'TA',
        reviewerUserId: ta1,
        status: 'Draft',
      });

      const info = await getPeerReviewInfoById(
        oidStr(),
        COURSE_ROLE.Faculty,
        testCourseId.toString(),
        pr._id.toString()
      );

      expect(info.teams.length).toBeGreaterThanOrEqual(2);
      // since Faculty, capabilities.assignmentPageTeamIds should include scoped team ids
      expect(
        info.capabilities.assignmentPageTeamIds.length
      ).toBeGreaterThanOrEqual(2);

      // assignmentsOfTeam should exist for each reviewee team from loadAssignmentsState
      expect(Object.keys(info.assignmentsOfTeam).length).toBeGreaterThanOrEqual(
        2
      );

      // populateAssignmentsOfTeamReviewers runs for non-student roles
      const entryA = info.assignmentsOfTeam[teamA._id.toString()];
      expect(entryA).toBeTruthy();
      expect(Array.isArray(entryA.reviewers.students)).toBe(true);

      // TA assignments included because taAssignments true & faculty wants all TAs
      expect(Object.keys(info.TAAssignments).length).toBeGreaterThanOrEqual(1);
    });

    it('team reviewerType: loads team submissions and populates assignedReviewsToTeam', async () => {
      const ta1 = oid();
      const studentId = oid();
      await ensureUser(studentId, 'S');
      await ensureUser(ta1, 'TA');

      const pr = await makePeerReview({
        reviewerType: 'Team',
        taAssignments: false,
      });

      const teamA = await makeTeam({
        number: 1,
        members: [studentId],
        TA: ta1,
      });
      const teamB = await makeTeam({ number: 2, members: [oid()], TA: ta1 });

      await makeTeamData(1);
      await makeTeamData(2);

      const aA = await makeAssignment(pr._id, teamA._id);

      // create a TEAM submission where reviewerTeamId is teamB (reviewer), assignment is for teamA
      await makeSubmission(pr._id, aA._id, {
        reviewerKind: 'Team',
        reviewerTeamId: teamB._id,
        status: 'Draft',
      });

      const info = await getPeerReviewInfoById(
        oidStr(),
        COURSE_ROLE.Faculty,
        testCourseId.toString(),
        pr._id.toString()
      );

      // find teamB dto should have assignedReviewsToTeam non-empty
      const dtoB = info.teams.find(t => t.teamId === teamB._id.toString());
      expect(dtoB).toBeTruthy();
      expect(dtoB?.assignedReviewsToTeam.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Helper functions - direct unit tests for branch coverage', () => {
    it('getPeerReviewById throws NotFoundError when peer review is missing', async () => {
      await expect(getPeerReviewById(oidStr())).rejects.toBeInstanceOf(
        NotFoundError
      );
    });

    it('loadAssignmentsState skips assignment when reviewee is missing', async () => {
      const { __testables } = require('../../services/peerReviewService');
      const prId = oid();
      const missingTeamId = oid();

      await makeAssignment(prId, missingTeamId);

      (resolveTeamRepo as jest.Mock).mockResolvedValueOnce({
        repoName: 'RecoveredRepo',
        repoUrl: 'http://example.com/recovered.git',
        gitHubOrgName: 'OrgX',
      });

      const state = await __testables.loadAssignmentsState(
        testCourseId.toString(),
        prId.toString(),
        [missingTeamId.toString()]
      );

      expect(state.assignmentById.size).toBe(0);
      expect(Object.keys(state.assignmentsOfTeam)).toHaveLength(0);
    });

    it('buildAssignedReviewMaps ignores team/TA submissions whose assignment is missing', () => {
      const { __testables } = require('../../services/peerReviewService');
      const missingAssignmentId = oid();

      const submissions = {
        studentSubs: [],
        teamSubs: [
          {
            _id: oid(),
            peerReviewAssignmentId: missingAssignmentId,
            reviewerTeamId: oid(),
            status: 'Draft',
          } as any,
        ],
        taSubs: [
          {
            _id: oid(),
            peerReviewAssignmentId: missingAssignmentId,
            reviewerUserId: oid(),
            status: 'Draft',
          } as any,
        ],
      };

      const assignmentById = new Map();
      const usersById = new Map<string, string>();
      const taIdsWanted = ['ta1'];

      const out = __testables.buildAssignedReviewMaps(
        submissions,
        assignmentById,
        taIdsWanted,
        usersById
      );

      expect(out.teamAssignedMap.size).toBe(0);
      expect(out.assignmentsForTAs.ta1).toBeTruthy();
      expect(out.assignmentsForTAs.ta1.assignedReviews).toEqual([]);
    });

    it('populateAssignmentsOfTeamReviewers covers continue branches for missing assignment/team/reviewer ids', () => {
      const { __testables } = require('../../services/peerReviewService');
      const existingTeamId = oidStr();
      const missingTeamId = oidStr();

      const assignmentPresentExistingTeam = {
        _id: oidStr(),
        reviewee: { _id: existingTeamId },
      } as any;
      const assignmentPresentMissingTeam = {
        _id: oidStr(),
        reviewee: { _id: missingTeamId },
      } as any;

      const assignmentById = new Map<string, any>([
        [assignmentPresentExistingTeam._id, assignmentPresentExistingTeam],
        [assignmentPresentMissingTeam._id, assignmentPresentMissingTeam],
      ]);

      const assignmentsOfTeam: Record<string, any> = {
        [existingTeamId]: {
          assignment: assignmentPresentExistingTeam,
          reviewers: { students: [], teams: [], TAs: [] },
        },
      };

      const submissions = {
        // student loop: !assignment, !assignmentsOfTeam[revieweeTeamId], !rid
        studentSubs: [
          {
            _id: oid(),
            peerReviewAssignmentId: oid(), // missing assignment
            reviewerUserId: oid(),
            status: 'Draft',
          } as any,
          {
            _id: oid(),
            peerReviewAssignmentId: assignmentPresentMissingTeam._id,
            reviewerUserId: oid(),
            status: 'Draft',
          } as any,
          {
            _id: oid(),
            peerReviewAssignmentId: assignmentPresentExistingTeam._id,
            status: 'Draft', // reviewerUserId missing
          } as any,
        ],

        // team loop: !assignment, !assignmentsOfTeam[revieweeTeamId], !tid
        teamSubs: [
          {
            _id: oid(),
            peerReviewAssignmentId: oid(), // missing assignment
            reviewerTeamId: oid(),
            status: 'Draft',
          } as any,
          {
            _id: oid(),
            peerReviewAssignmentId: assignmentPresentMissingTeam._id,
            reviewerTeamId: oid(),
            status: 'Draft',
          } as any,
          {
            _id: oid(),
            peerReviewAssignmentId: assignmentPresentExistingTeam._id,
            status: 'Draft', // reviewerTeamId missing
          } as any,
        ],

        // ta loop: !assignment, !assignmentsOfTeam[revieweeTeamId], !rid
        taSubs: [
          {
            _id: oid(),
            peerReviewAssignmentId: oid(), // missing assignment
            reviewerUserId: oid(),
            status: 'Draft',
          } as any,
          {
            _id: oid(),
            peerReviewAssignmentId: assignmentPresentMissingTeam._id,
            reviewerUserId: oid(),
            status: 'Draft',
          } as any,
          {
            _id: oid(),
            peerReviewAssignmentId: assignmentPresentExistingTeam._id,
            status: 'Draft', // reviewerUserId missing
          } as any,
        ],
      };

      __testables.populateAssignmentsOfTeamReviewers(
        assignmentsOfTeam,
        submissions,
        assignmentById,
        new Map<string, string>(),
        new Map<string, number>()
      );

      expect(assignmentsOfTeam[existingTeamId].reviewers.students).toHaveLength(0);
      expect(assignmentsOfTeam[existingTeamId].reviewers.teams).toHaveLength(0);
      expect(assignmentsOfTeam[existingTeamId].reviewers.TAs).toHaveLength(0);
    });

    it('emptyPeerReviewInfo returns correct structure for Individual and Team reviewer types', () => {
      const { __testables } = require('../../services/peerReviewService');
      const prId = oidStr();
      
      const individual = __testables.emptyPeerReviewInfo(prId, 'Individual');
      expect(individual._id).toBe(prId);
      expect(individual.teams).toEqual([]);
      expect(individual.assignmentsOfTeam).toEqual({});
      expect(individual.reviewerType).toBe('Individual');

      const team = __testables.emptyPeerReviewInfo(prId, 'Team');
      expect(team.reviewerType).toBe('Team');
    });

    it('getScopedTeamIds: Student with no team returns empty', async () => {
      const { __testables } = require('../../services/peerReviewService');
      const studentId = oidStr();

      const result = await __testables.getScopedTeamIds(
        studentId,
        COURSE_ROLE.Student,
        testTeamSetId.toString()
      );
      
      expect(result.teamIds).toEqual([]);
      expect(result.filterByTA).toBeUndefined();
    });

    it('getScopedTeamIds: TA with assigned teams returns filterByTA', async () => {
      const { __testables } = require('../../services/peerReviewService');
      const ta1 = oid();
      const team1 = await makeTeam({ number: 5, TA: ta1 });

      const result = await __testables.getScopedTeamIds(
        ta1.toString(),
        COURSE_ROLE.TA,
        testTeamSetId.toString()
      );

      expect(result.teamIds).toContain(team1._id.toString());
      expect(result.filterByTA).toBe(ta1.toString());
    });

    it('getScopedTeamIds: Faculty returns all teams in teamSet without filterByTA', async () => {
      const { __testables } = require('../../services/peerReviewService');
      const team1 = await makeTeam({ number: 6 });
      const team2 = await makeTeam({ number: 7 });

      const result = await __testables.getScopedTeamIds(
        oidStr(),
        COURSE_ROLE.Faculty,
        testTeamSetId.toString()
      );

      expect(result.teamIds).toContain(team1._id.toString());
      expect(result.teamIds).toContain(team2._id.toString());
      expect(result.filterByTA).toBeUndefined();
    });

    it('getScopedTeams: handles teams with null TA and empty members', async () => {
      const { __testables } = require('../../services/peerReviewService');
      const team = await makeTeam({ number: 8, TA: null, members: [] });

      const result = await __testables.getScopedTeams(
        testTeamSetId.toString(),
        [team._id.toString()]
      );

      expect(result).toHaveLength(1);
      expect(result[0].taId).toBeNull();
      expect(result[0].memberIds).toEqual([]);
    });

    it('getScopedTeams: empty teamIds returns empty list', async () => {
      const { __testables } = require('../../services/peerReviewService');

      const result = await __testables.getScopedTeams(testTeamSetId.toString(), []);

      expect(result).toEqual([]);
    });

    it('pushReviewer: does nothing when entry does not exist', () => {
      const { __testables } = require('../../services/peerReviewService');
      const assignmentsOfTeam = {};

      __testables.pushReviewer(assignmentsOfTeam, 'nonexistent-id', 'Student', {
        userId: 'user1',
        name: 'John',
        teamId: '',
        teamNumber: 1,
        status: 'Draft',
      });

      expect(Object.keys(assignmentsOfTeam)).toEqual([]);
    });

    it('pushReviewer: pushes Student reviewer', () => {
      const { __testables } = require('../../services/peerReviewService');
      const revieweeTeamId = 'team123';
      const assignmentsOfTeam = {
        [revieweeTeamId]: {
          assignment: {} as any,
          reviewers: { students: [], teams: [], TAs: [] },
        },
      };

      __testables.pushReviewer(assignmentsOfTeam, revieweeTeamId, 'Student', {
        userId: 'user1',
        name: 'John',
        teamId: '',
        teamNumber: 1,
        status: 'Submitted',
      });

      expect(assignmentsOfTeam[revieweeTeamId].reviewers.students).toHaveLength(1);
      expect((assignmentsOfTeam[revieweeTeamId].reviewers.students[0] as any).userId).toBe('user1');
    });

    it('pushReviewer: pushes Team reviewer', () => {
      const { __testables } = require('../../services/peerReviewService');
      const revieweeTeamId = 'team123';
      const assignmentsOfTeam = {
        [revieweeTeamId]: {
          assignment: {} as any,
          reviewers: { students: [], teams: [], TAs: [] },
        },
      };

      __testables.pushReviewer(assignmentsOfTeam, revieweeTeamId, 'Team', {
        userId: '',
        name: '',
        teamId: 'reviewer-team',
        teamNumber: 2,
        status: 'Draft',
      });

      expect(assignmentsOfTeam[revieweeTeamId].reviewers.teams).toHaveLength(1);
      expect((assignmentsOfTeam[revieweeTeamId].reviewers.teams[0] as any).teamId).toBe('reviewer-team');
    });

    it('pushReviewer: pushes TA reviewer', () => {
      const { __testables } = require('../../services/peerReviewService');
      const revieweeTeamId = 'team123';
      const assignmentsOfTeam = {
        [revieweeTeamId]: {
          assignment: {} as any,
          reviewers: { students: [], teams: [], TAs: [] },
        },
      };

      __testables.pushReviewer(assignmentsOfTeam, revieweeTeamId, 'TA', {
        userId: 'ta-user1',
        name: 'TA John',
        teamId: '',
        teamNumber: -1,
        status: 'Submitted',
      });

      expect(assignmentsOfTeam[revieweeTeamId].reviewers.TAs).toHaveLength(1);
      expect((assignmentsOfTeam[revieweeTeamId].reviewers.TAs[0] as any).name).toBe('TA John');
    });

    it('toAssignedReviewDTO: returns null when assignment not found', () => {
      const { __testables } = require('../../services/peerReviewService');
      const assignmentById = new Map();
      const submission = {
        _id: oid(),
        peerReviewAssignmentId: oid(),
        status: 'Draft',
      } as any;

      const result = __testables.toAssignedReviewDTO(submission, assignmentById);

      expect(result).toBeNull();
    });

    it('toAssignedReviewDTO: returns DTO when assignment found', () => {
      const { __testables } = require('../../services/peerReviewService');
      const submissionId = oid();
      const assignmentId = oid();
      const mockAssignment = { _id: assignmentId.toString() } as any;
      const assignmentById = new Map([[assignmentId.toString(), mockAssignment]]);
      const submission = {
        _id: submissionId,
        peerReviewAssignmentId: assignmentId,
        status: 'Submitted',
        startedAt: new Date(),
        lastEditedAt: new Date(),
        submittedAt: new Date(),
        overallComment: 'Good work',
      } as any;

      const result = __testables.toAssignedReviewDTO(submission, assignmentById);

      expect(result).not.toBeNull();
      expect(result?.submissionId).toBe(submissionId.toString());
      expect(result?.status).toBe('Submitted');
      expect(result?.assignment).toBe(mockAssignment);
    });

    it('computeReviewerScope: Student returns single user, no TAs', () => {
      const { __testables } = require('../../services/peerReviewService');
      const userId = oidStr();
      const scopedTeams = [
        { id: 't1', number: 1, memberIds: [userId, 'other1'], taId: 'ta1' },
        { id: 't2', number: 2, memberIds: ['other2'], taId: 'ta2' },
      ];

      const result = __testables.computeReviewerScope(
        userId,
        COURSE_ROLE.Student,
        'Individual',
        false,
        scopedTeams
      );

      expect(result.scopedMemberIds).toEqual([userId]);
      expect(result.scopedReviewerTeamIds).toEqual(['t1', 't2']);
      expect(result.taIdsWanted).toEqual([]);
    });

    it('computeReviewerScope: Faculty gets all members and all TAs when enabled', () => {
      const { __testables } = require('../../services/peerReviewService');
      const scopedTeams = [
        { id: 't1', number: 1, memberIds: ['u1', 'u2'], taId: 'ta1' },
        { id: 't2', number: 2, memberIds: ['u3'], taId: 'ta2' },
      ];

      const result = __testables.computeReviewerScope(
        oidStr(),
        COURSE_ROLE.Faculty,
        'Individual',
        true,
        scopedTeams
      );

      expect(result.scopedMemberIds).toContain('u1');
      expect(result.scopedMemberIds).toContain('u2');
      expect(result.scopedMemberIds).toContain('u3');
      expect(result.taIdsWanted).toContain('ta1');
      expect(result.taIdsWanted).toContain('ta2');
    });

    it('computeReviewerScope: TA gets only self as reviewer when enabled', () => {
      const { __testables } = require('../../services/peerReviewService');
      const taId = oidStr();
      const scopedTeams = [{ id: 't1', number: 1, memberIds: ['u1'], taId }];

      const result = __testables.computeReviewerScope(
        taId,
        COURSE_ROLE.TA,
        'Individual',
        true,
        scopedTeams
      );

      expect(result.taIdsWanted).toEqual([taId]);
    });
  });

  describe('getPeerReviewProgressOverviewById', () => {
    it('TA with no assigned teams → returns empty overview with supervisingTeams scope', async () => {
      const taId = oid();
      await ensureUser(taId, 'TA');
      const pr = await makePeerReview({ reviewerType: 'Individual', taAssignments: true });

      const result = await getPeerReviewProgressOverviewById(
        taId.toString(),
        COURSE_ROLE.TA,
        testCourseId.toString(),
        pr._id.toString()
      );

      expect(result.peerReviewId).toBe(pr._id.toString());
      expect(result.scope).toBe('supervisingTeams');
      expect(result.submissions.total).toBe(0);
      expect(result.grading.total).toBe(0);
    });

    it('Faculty with teams but no assignments → returns empty overview with course scope', async () => {
      const pr = await makePeerReview({ reviewerType: 'Individual', taAssignments: false });
      await makeTeam({ number: 20 });

      const result = await getPeerReviewProgressOverviewById(
        oidStr(),
        COURSE_ROLE.Faculty,
        testCourseId.toString(),
        pr._id.toString()
      );

      expect(result.peerReviewId).toBe(pr._id.toString());
      expect(result.scope).toBe('course');
      expect(result.submissions.total).toBe(0);
      expect(result.grading.total).toBe(0);
    });

    it('Faculty with assignments but no submissions → returns empty overview', async () => {
      const pr = await makePeerReview({ reviewerType: 'Individual', taAssignments: false });
      const team = await makeTeam({ number: 21 });
      await makeAssignment(pr._id, team._id);

      const result = await getPeerReviewProgressOverviewById(
        oidStr(),
        COURSE_ROLE.Faculty,
        testCourseId.toString(),
        pr._id.toString()
      );

      expect(result.peerReviewId).toBe(pr._id.toString());
      expect(result.scope).toBe('course');
      expect(result.submissions.total).toBe(0);
    });

    it('Faculty: counts submission statuses and all map to toBeAssigned when no grading tasks', async () => {
      const pr = await makePeerReview({ reviewerType: 'Individual', taAssignments: false });
      const team = await makeTeam({ number: 22 });
      const assignment = await makeAssignment(pr._id, team._id);

      await makeSubmission(pr._id, assignment._id, {
        status: 'NotStarted',
        reviewerKind: 'Student',
        reviewerUserId: oid(),
      });
      await makeSubmission(pr._id, assignment._id, {
        status: 'Draft',
        reviewerKind: 'Student',
        reviewerUserId: oid(),
      });
      await makeSubmission(pr._id, assignment._id, {
        status: 'Submitted',
        reviewerKind: 'Student',
        reviewerUserId: oid(),
      });

      const result = await getPeerReviewProgressOverviewById(
        oidStr(),
        COURSE_ROLE.Faculty,
        testCourseId.toString(),
        pr._id.toString()
      );

      expect(result.submissions.total).toBe(3);
      expect(result.submissions.notStarted).toBe(1);
      expect(result.submissions.draft).toBe(1);
      expect(result.submissions.submitted).toBe(1);
      expect(result.submissions.started).toBe(2); // total - notStarted
      expect(result.grading.total).toBe(3);
      expect(result.grading.graded).toBe(0);
      expect(result.grading.inProgress).toBe(0);
      expect(result.grading.notYetGraded).toBe(0);
      expect(result.grading.toBeAssigned).toBe(3);
    });

    it('Faculty: correctly buckets grading tasks – Completed, InProgress, Assigned, and no-task fallback', async () => {
      const pr = await makePeerReview({ reviewerType: 'Individual', taAssignments: false });
      const team = await makeTeam({ number: 23 });
      const assignment = await makeAssignment(pr._id, team._id);

      const sub1 = await makeSubmission(pr._id, assignment._id, {
        status: 'Submitted',
        reviewerKind: 'Student',
        reviewerUserId: oid(),
      });
      const sub2 = await makeSubmission(pr._id, assignment._id, {
        status: 'Submitted',
        reviewerKind: 'Student',
        reviewerUserId: oid(),
      });
      const sub3 = await makeSubmission(pr._id, assignment._id, {
        status: 'Submitted',
        reviewerKind: 'Student',
        reviewerUserId: oid(),
      });
      // sub4 intentionally has no grading task → toBeAssigned
      await makeSubmission(pr._id, assignment._id, {
        status: 'Draft',
        reviewerKind: 'Student',
        reviewerUserId: oid(),
      });

      await makeGradingTask(pr._id, sub1._id, 'Completed');
      await makeGradingTask(pr._id, sub2._id, 'InProgress');
      await makeGradingTask(pr._id, sub3._id, 'Assigned');

      const result = await getPeerReviewProgressOverviewById(
        oidStr(),
        COURSE_ROLE.Faculty,
        testCourseId.toString(),
        pr._id.toString()
      );

      expect(result.grading.total).toBe(4);
      expect(result.grading.graded).toBe(1);       // Completed
      expect(result.grading.inProgress).toBe(1);   // InProgress
      expect(result.grading.notYetGraded).toBe(1); // Assigned
      expect(result.grading.toBeAssigned).toBe(1); // no task
    });

    it('Faculty: falls back to toBeAssigned for unrecognized grading task status', async () => {
      const pr = await makePeerReview({ reviewerType: 'Individual', taAssignments: false });
      const team = await makeTeam({ number: 230 });
      const assignment = await makeAssignment(pr._id, team._id);
      const submission = await makeSubmission(pr._id, assignment._id, {
        status: 'Submitted',
        reviewerKind: 'Student',
        reviewerUserId: oid(),
      });

      const gradingFindSpy = jest.spyOn(PeerReviewGradingTaskModel, 'find').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
          {
            peerReviewSubmissionId: submission._id,
            status: 'UnexpectedStatus',
          },
        ]),
      } as any);

      const result = await getPeerReviewProgressOverviewById(
        oidStr(),
        COURSE_ROLE.Faculty,
        testCourseId.toString(),
        pr._id.toString()
      );

      expect(result.grading.total).toBe(1);
      expect(result.grading.graded).toBe(0);
      expect(result.grading.inProgress).toBe(0);
      expect(result.grading.notYetGraded).toBe(0);
      expect(result.grading.toBeAssigned).toBe(1);

      gradingFindSpy.mockRestore();
    });

    it('Faculty: Completed takes precedence over InProgress when a submission has both task statuses', async () => {
      const pr = await makePeerReview({ reviewerType: 'Individual', taAssignments: false });
      const team = await makeTeam({ number: 24 });
      const assignment = await makeAssignment(pr._id, team._id);
      const sub = await makeSubmission(pr._id, assignment._id, {
        status: 'Submitted',
        reviewerKind: 'Student',
        reviewerUserId: oid(),
      });

      // Two tasks for the same submission but different graders – one Completed, one InProgress
      await makeGradingTask(pr._id, sub._id, 'Completed');
      await new PeerReviewGradingTaskModel({
        peerReviewId: pr._id,
        peerReviewSubmissionId: sub._id,
        grader: oid(),
        status: 'InProgress',
      }).save();

      const result = await getPeerReviewProgressOverviewById(
        oidStr(),
        COURSE_ROLE.Faculty,
        testCourseId.toString(),
        pr._id.toString()
      );

      expect(result.grading.graded).toBe(1);
      expect(result.grading.inProgress).toBe(0);
    });

    it('TA with assigned team → returns supervisingTeams scope scoped to that team only', async () => {
      const taId = oid();
      const otherTaId = oid();
      const myStudentId = oid();
      const otherStudentId = oid();
      await ensureUser(taId, 'MyTA');
      await ensureUser(otherTaId, 'OtherTA');
      await ensureUser(myStudentId, 'MyStudent');
      await ensureUser(otherStudentId, 'OtherStudent');

      const pr = await makePeerReview({ reviewerType: 'Individual', taAssignments: true });

      const myTeam = await makeTeam({ number: 25, TA: taId, members: [myStudentId] });
      const otherTeam = await makeTeam({ number: 26, TA: otherTaId, members: [otherStudentId] });

      const myAssignment = await makeAssignment(pr._id, myTeam._id);
      const otherAssignment = await makeAssignment(pr._id, otherTeam._id);

      // Supervised student submission (reviewing another team's assignment) should count
      await makeSubmission(pr._id, otherAssignment._id, {
        status: 'Draft',
        reviewerKind: 'Student',
        reviewerUserId: myStudentId,
      });

      // TA's own review should NOT be counted in progress overview
      await makeSubmission(pr._id, myAssignment._id, {
        status: 'Submitted',
        reviewerKind: 'TA',
        reviewerUserId: taId,
      });

      // Outsider student reviews (including reviews of supervised team's assignment) should NOT count
      await makeSubmission(pr._id, myAssignment._id, {
        status: 'Submitted',
        reviewerKind: 'Student',
        reviewerUserId: otherStudentId,
      });
      await makeSubmission(pr._id, otherAssignment._id, {
        status: 'Submitted',
        reviewerKind: 'Student',
        reviewerUserId: otherStudentId,
      });

      const result = await getPeerReviewProgressOverviewById(
        taId.toString(),
        COURSE_ROLE.TA,
        testCourseId.toString(),
        pr._id.toString()
      );

      expect(result.scope).toBe('supervisingTeams');
      // Only supervised student reviewer submissions should be counted
      expect(result.submissions.total).toBe(1);
      expect(result.submissions.draft).toBe(1);
      expect(result.submissions.submitted).toBe(0);
    });
  });
});
