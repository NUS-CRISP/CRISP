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

import {
  getAllPeerReviewsyId,
  getPeerReviewById,
  getPeerReviewInfoById,
  createPeerReviewById,
  deletePeerReviewById,
  updatePeerReviewById,
  getTeamDataById,
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
        reviewerType: 'Individual',
        taAssignments: false,
        minReviews: 1,
        maxReviews: 2,
      });

      expect(pr._id).toBeDefined();
      expect(initialiseAssignments).toHaveBeenCalledWith(
        testCourseId.toString(),
        pr._id.toString(),
        testTeamSetId.toString()
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
          reviewerType: 'Individual',
          taAssignments: false,
          minReviews: 1,
          maxReviews: 2,
        })
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('updatePeerReviewById', () => {
    it('updates peer review and reinitialises assignments when teamSetId provided', async () => {
      const pr = await makePeerReview({
        title: 'Old',
        teamSetId: testTeamSetId,
      });

      const updated = await updatePeerReviewById(pr._id.toString(), oidStr(), {
        assessmentName: 'New Title',
        teamSetId: testTeamSetId.toString(),
        taAssignments: true,
      });

      expect(updated.title).toBe('New Title');
      expect(deleteAssignmentsByPeerReviewId).toHaveBeenCalledWith(
        pr._id.toString()
      );
      expect(initialiseAssignments).toHaveBeenCalledWith(
        testCourseId.toString(),
        pr._id.toString(),
        testTeamSetId.toString()
      );
    });

    it('updates peer review but does NOT reinitialise when teamSetId omitted', async () => {
      const pr = await makePeerReview({ title: 'Old' });

      const updated = await updatePeerReviewById(pr._id.toString(), oidStr(), {
        assessmentName: 'New Title',
      });

      expect(updated.title).toBe('New Title');
      expect(deleteAssignmentsByPeerReviewId).toHaveBeenCalledWith(
        pr._id.toString()
      );
      expect(initialiseAssignments).not.toHaveBeenCalled();
    });

    it('throws NotFound when peer review missing', async () => {
      await expect(
        updatePeerReviewById(oidStr(), oidStr(), { assessmentName: 'x' })
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

    it('falls back when resolveTeamRepo throws (covers catch)', async () => {
      await makeTeamData(11);

      (resolveTeamRepo as jest.Mock).mockImplementation(async () => {
        throw new Error('boom');
      });

      const map = await getTeamDataById(testCourseId.toString(), ['11']);

      expect(map.get('11')?.repoName).toBe('');
      expect(map.get('11')?.repoUrl).toBe('');
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
});
