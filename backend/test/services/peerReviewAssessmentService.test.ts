import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { ConnectOptions, Types } from 'mongoose';

import CourseModel from '../../models/Course';
import TeamSetModel from '../../models/TeamSet';
import TeamModel from '../../models/Team';
import UserModel from '../../models/User';
import InternalAssessmentModel from '../../models/InternalAssessment';
import PeerReviewModel from '../../models/PeerReview';
import PeerReviewAssignmentModel from '../../models/PeerReviewAssignment';
import PeerReviewSubmissionModel from '../../models/PeerReviewSubmission';
import PeerReviewGradingTaskModel from '../../models/PeerReviewGradingTask';

import {
  getPeerReviewByAssessmentId,
  createPeerReviewAssessmentForCourse,
  updatePeerReviewAssessmentById,
  deletePeerReviewAssessmentById,
  getPeerReviewSubmissionsForAssessmentById,
  getPeerReviewResultsForAssessmentById,
  getPeerReviewGradingDTO,
} from '../../services/peerReviewAssessmentService';

import {
  createPeerReviewById,
  updatePeerReviewById,
  deletePeerReviewById,
} from '../../services/peerReviewService';
import { createAssignmentSet } from '../../services/assessmentAssignmentSetService';
import { deleteInternalAssessmentById } from '../../services/internalAssessmentService';
import { getPeerReviewCommentsBySubmissionId } from '../../services/peerReviewCommentsService';

import { COURSE_ROLE } from '@shared/types/auth/CourseRole';
import { BadRequestError, MissingAuthorizationError, NotFoundError } from '../../services/errors';

jest.mock('../../services/peerReviewService', () => ({
  __esModule: true,
  createPeerReviewById: jest.fn(),
  updatePeerReviewById: jest.fn(),
  deletePeerReviewById: jest.fn(),
}));

jest.mock('../../services/assessmentAssignmentSetService', () => ({
  __esModule: true,
  createAssignmentSet: jest.fn(),
}));

jest.mock('../../services/internalAssessmentService', () => ({
  __esModule: true,
  deleteInternalAssessmentById: jest.fn(),
}));

jest.mock('../../services/peerReviewCommentsService', () => ({
  __esModule: true,
  getPeerReviewCommentsBySubmissionId: jest.fn(),
}));

let mongoServer: MongoMemoryServer;

const oid = () => new Types.ObjectId();

const makeCourse = async (overrides: Partial<any> = {}) =>
  new CourseModel({
    name: 'Course',
    code: 'CS2000',
    semester: 'Spring 2026',
    startDate: new Date('2026-01-01'),
    courseType: 'Normal',
    students: overrides.students ?? [],
    TAs: overrides.TAs ?? [],
    ...overrides,
  }).save();

const makeTeamSet = async (courseId: Types.ObjectId) =>
  new TeamSetModel({ course: courseId, name: 'TS', teams: [] }).save();

const makeUser = async (name: string) =>
  new UserModel({ name, identifier: `id-${name}-${Date.now()}-${Math.random()}` }).save();

const makeAssessment = async (
  courseId: Types.ObjectId,
  teamSetId: Types.ObjectId,
  overrides: Partial<any> = {}
) =>
  new InternalAssessmentModel({
    course: courseId,
    assessmentType: 'peer_review',
    assessmentName: 'PRA',
    description: 'desc',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    maxMarks: 10,
    scaleToMaxMarks: true,
    granularity: 'individual',
    teamSet: teamSetId,
    areSubmissionsEditable: false,
    isReleased: false,
    questions: [],
    results: [],
    ...overrides,
  }).save();

const makePeerReview = async (
  courseId: Types.ObjectId,
  teamSetId: Types.ObjectId,
  assessmentId: Types.ObjectId,
  overrides: Partial<any> = {}
) => {
  const now = Date.now();
  const desired = overrides.status as 'Active' | 'Closed' | 'Upcoming' | undefined;
  const startDate =
    desired === 'Closed'
      ? new Date(now - 120_000)
      : desired === 'Upcoming'
        ? new Date(now + 60_000)
        : new Date(now - 60_000);
  const endDate =
    desired === 'Closed'
      ? new Date(now - 60_000)
      : desired === 'Upcoming'
        ? new Date(now + 120_000)
        : new Date(now + 60_000);

  return new PeerReviewModel({
    course: courseId,
    internalAssessmentId: assessmentId,
    teamSetId,
    title: 'PR',
    description: 'desc',
    startDate,
    endDate,
    reviewerType: 'Individual',
    taAssignments: true,
    minReviewsPerReviewer: 1,
    maxReviewsPerReviewer: 3,
    ...overrides,
  }).save();
};

const makeTeam = async (teamSetId: Types.ObjectId, overrides: Partial<any> = {}) =>
  new TeamModel({
    teamSet: teamSetId,
    number: overrides.number ?? Math.floor(Math.random() * 1000) + 1,
    members: overrides.members ?? [],
    TA: overrides.TA,
    ...overrides,
  }).save();

const makeAssignment = async (
  peerReviewId: Types.ObjectId,
  revieweeTeamId: Types.ObjectId,
  overrides: Partial<any> = {}
) =>
  new PeerReviewAssignmentModel({
    peerReviewId,
    reviewee: revieweeTeamId,
    repoName: 'Repo',
    repoUrl: 'http://example.com/repo.git',
    ...overrides,
  }).save();

const makeSubmission = async (
  peerReviewId: Types.ObjectId,
  assignmentId: Types.ObjectId,
  overrides: Partial<any> = {}
) => {
  const reviewerKind = overrides.reviewerKind ?? 'Student';
  const base: any = {
    peerReviewId,
    peerReviewAssignmentId: assignmentId,
    reviewerKind,
    status: overrides.status ?? 'Submitted',
    createdAt: new Date(),
  };
  if (reviewerKind === 'Team') base.reviewerTeamId = overrides.reviewerTeamId ?? oid();
  else base.reviewerUserId = overrides.reviewerUserId ?? oid();

  return new PeerReviewSubmissionModel({ ...base, ...overrides }).save();
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as ConnectOptions);
});

beforeEach(async () => {
  jest.clearAllMocks();

  await PeerReviewGradingTaskModel.deleteMany({});
  await PeerReviewSubmissionModel.deleteMany({});
  await PeerReviewAssignmentModel.deleteMany({});
  await PeerReviewModel.deleteMany({});
  await InternalAssessmentModel.deleteMany({});
  await TeamModel.deleteMany({});
  await TeamSetModel.deleteMany({});
  await CourseModel.deleteMany({});
  await UserModel.deleteMany({});

  (getPeerReviewCommentsBySubmissionId as jest.Mock).mockResolvedValue([]);

  jest.spyOn(mongoose, 'startSession').mockImplementation(async () => {
    const session = await mongoose.connection.startSession();
    jest.spyOn(session, 'startTransaction').mockImplementation(() => undefined as any);
    jest.spyOn(session, 'commitTransaction').mockImplementation(async () => undefined as any);
    jest.spyOn(session, 'abortTransaction').mockImplementation(async () => undefined as any);
    return session;
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('peerReviewAssessmentService', () => {
  it('getPeerReviewByAssessmentId returns peer review or throws', async () => {
    await expect(getPeerReviewByAssessmentId(oid().toString())).rejects.toBeInstanceOf(NotFoundError);

    const course = await makeCourse();
    const ts = await makeTeamSet(course._id);
    const assessment = await makeAssessment(course._id, ts._id);
    const pr = await makePeerReview(course._id, ts._id, assessment._id);

    const found = await getPeerReviewByAssessmentId(assessment._id.toString());
    expect(found._id.toString()).toBe(pr._id.toString());
  });

  it('create/update/delete peer review assessment delegation paths', async () => {
    const s1 = await makeUser('s1');
    const course = await makeCourse({ students: [s1._id] });
    const ts = await makeTeamSet(course._id);

    (createPeerReviewById as jest.Mock).mockResolvedValue({ _id: oid() });
    (createAssignmentSet as jest.Mock).mockResolvedValue(undefined);

    const created = await createPeerReviewAssessmentForCourse(course._id.toString(), {
      assessmentName: 'A1',
      description: 'd',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      gradingStartDate: new Date('2026-12-31'),
      teamSetId: ts._id.toString(),
      reviewerType: 'Individual',
      taAssignments: false,
      minReviews: 1,
      maxReviews: 2,
      maxMarks: 10,
      scaleToMaxMarks: true,
    });

    expect(created).toBeTruthy();
    expect(createPeerReviewById).toHaveBeenCalled();
    expect(createAssignmentSet).toHaveBeenCalled();

    const createdAssessment = await InternalAssessmentModel.findOne({
      course: course._id,
      assessmentName: 'A1',
    });
    expect(createdAssessment).toBeTruthy();
    expect(createdAssessment?.startDate.toISOString()).toBe(
      new Date('2026-01-01').toISOString()
    );
    // No gradingEndDate provided => assessment stays open-ended for grading
    expect(createdAssessment?.endDate).toBeNull();

    const assessment = await makeAssessment(course._id, ts._id);
    const pr = await makePeerReview(course._id, ts._id, assessment._id);

    (updatePeerReviewById as jest.Mock).mockResolvedValue({ _id: pr._id, title: 'Updated' });

    const updated = await updatePeerReviewAssessmentById(assessment._id.toString(), {
      assessmentName: 'Updated',
      description: 'dd',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      gradingStartDate: new Date('2026-12-31'),
      gradingEndDate: new Date('2027-01-15'),
      teamSetId: ts._id.toString(),
      reviewerType: 'Individual',
      taAssignments: true,
      minReviews: 1,
      maxReviews: 3,
      scaleToMaxMarks: true,
      maxMarks: 20,
    });

    expect(updated.updatedAssessment.assessmentName).toBe('Updated');
    expect(updated.updatedAssessment.endDate?.toISOString()).toBe(
      new Date('2027-01-15').toISOString()
    );
    expect(updatePeerReviewById).toHaveBeenCalled();

    (deletePeerReviewById as jest.Mock).mockResolvedValue({ deletedPeerReviewId: pr._id.toString() });
    (deleteInternalAssessmentById as jest.Mock).mockResolvedValue(undefined);

    const deleted = await deletePeerReviewAssessmentById(assessment._id.toString());
    expect(deleted.deletedPeerReviewId).toBe(pr._id.toString());
    expect(deleteInternalAssessmentById).toHaveBeenCalledWith(assessment._id.toString());
  });

  it('updatePeerReviewAssessmentById clears InternalAssessment endDate when gradingEndDate is omitted', async () => {
    const course = await makeCourse();
    const ts = await makeTeamSet(course._id);

    const assessment = await makeAssessment(course._id, ts._id, {
      endDate: new Date('2026-12-31'),
    });
    const pr = await makePeerReview(course._id, ts._id, assessment._id);

    (updatePeerReviewById as jest.Mock).mockResolvedValue({ _id: pr._id });

    const updated = await updatePeerReviewAssessmentById(assessment._id.toString(), {
      assessmentName: 'Updated No Grading End',
      description: 'desc',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      gradingStartDate: new Date('2026-12-31'),
      teamSetId: ts._id.toString(),
      reviewerType: 'Individual',
      taAssignments: true,
      minReviews: 1,
      maxReviews: 3,
      scaleToMaxMarks: true,
      maxMarks: 20,
    });

    expect(updated.updatedAssessment.endDate).toBeNull();
  });

  it('getPeerReviewSubmissionsForAssessmentById returns empty for TA without tasks', async () => {
    const ta = await makeUser('ta');
    const course = await makeCourse({ TAs: [ta._id] });
    const ts = await makeTeamSet(course._id);
    const assessment = await makeAssessment(course._id, ts._id, { maxMarks: undefined });
    const pr = await makePeerReview(course._id, ts._id, assessment._id);

    const reviewee = await makeTeam(ts._id);
    const assignment = await makeAssignment(pr._id, reviewee._id);
    await makeSubmission(pr._id, assignment._id, { reviewerKind: 'Student', reviewerUserId: oid() });

    const dto = await getPeerReviewSubmissionsForAssessmentById(
      assessment._id.toString(),
      ta._id.toString(),
      COURSE_ROLE.TA
    );

    expect(dto.items).toHaveLength(0);
    expect(dto.pagination.total).toBe(0);
  });

  it('getPeerReviewGradingDTO enforces TA task and returns faculty all grading summaries', async () => {
    const ta = await makeUser('ta');
    const faculty = await makeUser('faculty');
    const grader2 = await makeUser('grader2');
    const reviewerUser = await makeUser('reviewer');

    const course = await makeCourse();
    const ts = await makeTeamSet(course._id);
    const assessment = await makeAssessment(course._id, ts._id);
    const pr = await makePeerReview(course._id, ts._id, assessment._id);

    const reviewee = await makeTeam(ts._id, { number: 42 });
    const assignment = await makeAssignment(pr._id, reviewee._id, {
      repoName: 'R',
      repoUrl: 'U',
    });
    const submission = await makeSubmission(pr._id, assignment._id, {
      reviewerKind: 'Student',
      reviewerUserId: reviewerUser._id,
      status: 'Submitted',
    });

    await expect(
      getPeerReviewGradingDTO(
        ta._id.toString(),
        COURSE_ROLE.TA,
        assessment._id.toString(),
        submission._id.toString()
      )
    ).rejects.toBeInstanceOf(MissingAuthorizationError);

    await new PeerReviewGradingTaskModel({
      peerReviewId: pr._id,
      peerReviewSubmissionId: submission._id,
      grader: ta._id,
      status: 'InProgress',
      score: 7,
      feedback: 'ok',
    }).save();

    await new PeerReviewGradingTaskModel({
      peerReviewId: pr._id,
      peerReviewSubmissionId: submission._id,
      grader: grader2._id,
      status: 'Completed',
      score: 9,
      feedback: 'great',
    }).save();

    const taDto = await getPeerReviewGradingDTO(
      ta._id.toString(),
      COURSE_ROLE.TA,
      assessment._id.toString(),
      submission._id.toString()
    );

    expect(taDto.myGradingTask?._id).toBeTruthy();
    expect(taDto.gradingTasks).toHaveLength(1);
    expect(getPeerReviewCommentsBySubmissionId).toHaveBeenCalled();

    const facultyDto = await getPeerReviewGradingDTO(
      faculty._id.toString(),
      COURSE_ROLE.Faculty,
      assessment._id.toString(),
      submission._id.toString()
    );

    expect(facultyDto.myGradingTask).toBeNull();
    expect(facultyDto.gradingTasks.length).toBe(2);
  });

  it('updatePeerReviewAssessmentById rejects non-peer-review assessment', async () => {
    const course = await makeCourse();
    const ts = await makeTeamSet(course._id);
    const nonPrAssessment = await makeAssessment(course._id, ts._id, {
      assessmentType: 'standard',
    });

    await expect(
      updatePeerReviewAssessmentById(nonPrAssessment._id.toString(), {
        assessmentName: 'x',
        description: 'x',
        startDate: new Date(),
        endDate: new Date(),
        teamSetId: ts._id.toString(),
        reviewerType: 'Individual',
        taAssignments: false,
        minReviews: 1,
        maxReviews: 1,
        scaleToMaxMarks: true,
      })
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it('covers create/update/delete error branches', async () => {
    const missingId = oid().toString();
    const s1 = await makeUser('s-create');
    const course = await makeCourse({ students: [s1._id] });

    await expect(
      createPeerReviewAssessmentForCourse(missingId, {
        assessmentName: 'A1',
        description: 'd',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        teamSetId: oid().toString(),
        reviewerType: 'Individual',
        taAssignments: false,
        minReviews: 1,
        maxReviews: 2,
        maxMarks: 10,
        scaleToMaxMarks: true,
      })
    ).rejects.toBeInstanceOf(NotFoundError);

    await expect(
      createPeerReviewAssessmentForCourse(course._id.toString(), {
        assessmentName: 'A1',
        description: 'd',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        teamSetId: oid().toString(),
        reviewerType: 'Individual',
        taAssignments: false,
        minReviews: 1,
        maxReviews: 2,
        maxMarks: 10,
        scaleToMaxMarks: true,
      })
    ).rejects.toBeInstanceOf(NotFoundError);

    const ts = await makeTeamSet(course._id);
    (createPeerReviewById as jest.Mock).mockResolvedValue({ _id: oid() });
    (createAssignmentSet as jest.Mock).mockRejectedValue(new Error('assign-set-failed'));
    await expect(
      createPeerReviewAssessmentForCourse(course._id.toString(), {
        assessmentName: 'A2',
        description: 'd',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        teamSetId: ts._id.toString(),
        reviewerType: 'Team',
        taAssignments: true,
        minReviews: 1,
        maxReviews: 2,
        maxMarks: 10,
        scaleToMaxMarks: true,
      })
    ).resolves.toBeTruthy();

    await expect(
      updatePeerReviewAssessmentById(missingId, {
        assessmentName: 'x',
        description: 'x',
        startDate: new Date(),
        endDate: new Date(),
        teamSetId: oid().toString(),
        reviewerType: 'Individual',
        taAssignments: false,
        minReviews: 1,
        maxReviews: 1,
        scaleToMaxMarks: true,
      })
    ).rejects.toBeInstanceOf(NotFoundError);

    const assessment = await makeAssessment(course._id, ts._id);
    const pr = await makePeerReview(course._id, ts._id, assessment._id);

    const findByIdAndUpdateSpy = jest
      .spyOn(InternalAssessmentModel, 'findByIdAndUpdate')
      .mockResolvedValueOnce(null as any);
    await expect(
      updatePeerReviewAssessmentById(assessment._id.toString(), {
        assessmentName: 'x',
        description: 'x',
        startDate: new Date(),
        endDate: new Date(),
        teamSetId: ts._id.toString(),
        reviewerType: 'Individual',
        taAssignments: false,
        minReviews: 1,
        maxReviews: 1,
        scaleToMaxMarks: true,
      })
    ).rejects.toBeInstanceOf(NotFoundError);
    findByIdAndUpdateSpy.mockRestore();

    await PeerReviewModel.deleteMany({ _id: pr._id });
    await expect(
      updatePeerReviewAssessmentById(assessment._id.toString(), {
        assessmentName: 'x',
        description: 'x',
        startDate: new Date(),
        endDate: new Date(),
        teamSetId: ts._id.toString(),
        reviewerType: 'Individual',
        taAssignments: false,
        minReviews: 1,
        maxReviews: 1,
        scaleToMaxMarks: true,
      })
    ).rejects.toBeInstanceOf(NotFoundError);

    const pr2 = await makePeerReview(course._id, ts._id, assessment._id);
    (updatePeerReviewById as jest.Mock).mockResolvedValueOnce(null);
    await expect(
      updatePeerReviewAssessmentById(assessment._id.toString(), {
        assessmentName: 'x',
        description: 'x',
        startDate: new Date(),
        endDate: new Date(),
        teamSetId: ts._id.toString(),
        reviewerType: 'Individual',
        taAssignments: false,
        minReviews: 1,
        maxReviews: 1,
        scaleToMaxMarks: true,
      })
    ).rejects.toBeInstanceOf(NotFoundError);

    await PeerReviewModel.deleteMany({ _id: pr2._id });
    await expect(deletePeerReviewAssessmentById(assessment._id.toString())).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it('covers submissions listing branches for faculty and TA', async () => {
    const ta = await makeUser('ta-sub');
    const grader2 = await makeUser('grader2-sub');
    const graderDeleted = await makeUser('to-delete');
    const reviewerUser = await makeUser('student-rev');
    const teamMember = await makeUser('team-member');

    const course = await makeCourse({ TAs: [ta._id] });
    const ts = await makeTeamSet(course._id);
    const reviewee = await makeTeam(ts._id, { number: 7 });
    const reviewerTeam = await makeTeam(ts._id, { number: 11, members: [teamMember._id] });

    const assessment = await makeAssessment(course._id, ts._id, { maxMarks: undefined });
    const pr = await makePeerReview(course._id, ts._id, assessment._id);

    const assignment = await makeAssignment(pr._id, reviewee._id);
    const sStudent = await makeSubmission(pr._id, assignment._id, {
      reviewerKind: 'Student',
      reviewerUserId: reviewerUser._id,
      status: 'Submitted',
      startedAt: new Date('2026-01-02'),
      lastEditedAt: new Date('2026-01-03'),
    });
    const sTeam = await makeSubmission(pr._id, assignment._id, {
      reviewerKind: 'Team',
      reviewerTeamId: reviewerTeam._id,
      status: 'Submitted',
      submittedAt: new Date('2026-01-04'),
    });

    await new PeerReviewGradingTaskModel({
      peerReviewId: pr._id,
      peerReviewSubmissionId: sStudent._id,
      grader: ta._id,
      status: 'Completed',
      gradedAt: new Date('2026-01-05'),
    }).save();
    await new PeerReviewGradingTaskModel({
      peerReviewId: pr._id,
      peerReviewSubmissionId: sStudent._id,
      grader: grader2._id,
      status: 'Completed',
      gradedAt: new Date('2026-01-04'),
    }).save();
    await new PeerReviewGradingTaskModel({
      peerReviewId: pr._id,
      peerReviewSubmissionId: sTeam._id,
      grader: ta._id,
      status: 'InProgress',
    }).save();
    await new PeerReviewGradingTaskModel({
      peerReviewId: pr._id,
      peerReviewSubmissionId: sTeam._id,
      grader: graderDeleted._id,
      status: 'Assigned',
    }).save();
    await UserModel.deleteOne({ _id: graderDeleted._id });

    const facultyDto = await getPeerReviewSubmissionsForAssessmentById(
      assessment._id.toString(),
      ta._id.toString(),
      COURSE_ROLE.Faculty,
      1,
      10
    );
    expect(facultyDto.items.length).toBe(2);
    expect(facultyDto.items[0].lastActivityAt).toBeTruthy();

    const taDto = await getPeerReviewSubmissionsForAssessmentById(
      assessment._id.toString(),
      ta._id.toString(),
      COURSE_ROLE.TA,
      1,
      10
    );
    expect(taDto.items.length).toBe(2);
    expect(taDto.pagination.total).toBe(2);
  });

  it('covers submissions listing validation failures', async () => {
    const u = await makeUser('u-sub-validation');
    await expect(
      getPeerReviewSubmissionsForAssessmentById(oid().toString(), u._id.toString(), COURSE_ROLE.Faculty)
    ).rejects.toBeInstanceOf(NotFoundError);

    const course = await makeCourse();
    const ts = await makeTeamSet(course._id);
    const nonPr = await makeAssessment(course._id, ts._id, { assessmentType: 'standard' });

    await expect(
      getPeerReviewSubmissionsForAssessmentById(nonPr._id.toString(), u._id.toString(), COURSE_ROLE.Faculty)
    ).rejects.toBeInstanceOf(BadRequestError);

    const prAssessment = await makeAssessment(course._id, ts._id);
    await expect(
      getPeerReviewSubmissionsForAssessmentById(prAssessment._id.toString(), u._id.toString(), COURSE_ROLE.Faculty)
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('covers submission fallback fields and lastActivity precedence', async () => {
    const faculty = await makeUser('faculty-sub-fallback');
    const reviewer1 = await makeUser('reviewer-sub-fallback-1');
    const reviewer2 = await makeUser('reviewer-sub-fallback-2');
    const reviewer3 = await makeUser('reviewer-sub-fallback-3');
    const reviewer4 = await makeUser('reviewer-sub-fallback-4');
    const course = await makeCourse();
    const ts = await makeTeamSet(course._id);
    const reviewee = await makeTeam(ts._id, { number: 3 });
    const assessment = await makeAssessment(course._id, ts._id);
    const pr = await makePeerReview(course._id, ts._id, assessment._id);

    const validAssignment = await makeAssignment(pr._id, reviewee._id);
    const danglingAssignmentId = oid();

    await makeSubmission(pr._id, validAssignment._id, {
      reviewerKind: 'Student',
      reviewerUserId: reviewer1._id,
      submittedAt: new Date('2026-01-10'),
    });
    await makeSubmission(pr._id, validAssignment._id, {
      reviewerKind: 'Student',
      reviewerUserId: reviewer2._id,
      lastEditedAt: new Date('2026-01-09'),
    });
    await makeSubmission(pr._id, validAssignment._id, {
      reviewerKind: 'Student',
      reviewerUserId: reviewer3._id,
      startedAt: new Date('2026-01-08'),
    });
    await makeSubmission(pr._id, danglingAssignmentId as any, {
      reviewerKind: 'Student',
      reviewerUserId: reviewer4._id,
      createdAt: new Date('2026-01-07'),
    });

    const dto = await getPeerReviewSubmissionsForAssessmentById(
      assessment._id.toString(),
      faculty._id.toString(),
      COURSE_ROLE.Faculty,
      1,
      10
    );

    expect(dto.items.length).toBe(4);
    expect(dto.items.some(i => i.revieweeTeam.teamNumber === -1)).toBe(true);
    expect(dto.items.some(i => i.grading.count === 0)).toBe(true);
  });

  it('covers peer review results for perStudent/perTeam and validations', async () => {
    await expect(getPeerReviewResultsForAssessmentById(oid().toString())).rejects.toBeInstanceOf(
      NotFoundError
    );

    const course = await makeCourse();
    const tsMissing = await makeTeamSet(course._id);
    const nonPr = await makeAssessment(course._id, tsMissing._id, { assessmentType: 'standard' });
    await expect(getPeerReviewResultsForAssessmentById(nonPr._id.toString())).rejects.toBeInstanceOf(
      BadRequestError
    );

    const noTeamSet = await makeAssessment(course._id, tsMissing._id, { teamSet: undefined as any });
    await expect(getPeerReviewResultsForAssessmentById(noTeamSet._id.toString())).rejects.toBeInstanceOf(
      BadRequestError
    );

    const ts = await makeTeamSet(course._id);
    const assessment = await makeAssessment(course._id, ts._id);
    await expect(getPeerReviewResultsForAssessmentById(assessment._id.toString())).rejects.toBeInstanceOf(
      NotFoundError
    );

    const pr = await makePeerReview(course._id, ts._id, assessment._id, { reviewerType: 'Individual' });

    const s1 = await makeUser('res-s1');
    const s2 = await makeUser('res-s2');
    const t1 = await makeTeam(ts._id, { number: 1, members: [s1._id, s2._id] });
    await TeamSetModel.findByIdAndUpdate(ts._id, { $set: { teams: [t1._id] } });

    const assignment = await makeAssignment(pr._id, t1._id);
    const sub1 = await makeSubmission(pr._id, assignment._id, {
      reviewerKind: 'Student',
      reviewerUserId: s1._id,
      status: 'Submitted',
    });
    const sub2 = await makeSubmission(pr._id, assignment._id, {
      reviewerKind: 'Team',
      reviewerTeamId: t1._id,
      status: 'Submitted',
    });

    await new PeerReviewGradingTaskModel({
      peerReviewId: pr._id,
      peerReviewSubmissionId: sub1._id,
      grader: s2._id,
      status: 'Completed',
      score: 8,
    }).save();
    await new PeerReviewGradingTaskModel({
      peerReviewId: pr._id,
      peerReviewSubmissionId: sub2._id,
      grader: s1._id,
      status: 'Completed',
      score: 6,
    }).save();

    const studentView = await getPeerReviewResultsForAssessmentById(
      assessment._id.toString(),
      'perStudent',
      1,
      10
    );
    expect(studentView.perStudent.length).toBe(2);

    const teamView = await getPeerReviewResultsForAssessmentById(
      assessment._id.toString(),
      'perTeam',
      1,
      10
    );
    expect(teamView.perTeam.length).toBe(1);

    const emptyTs = await makeTeamSet(course._id);
    const emptyAssessment = await makeAssessment(course._id, emptyTs._id);
    await makePeerReview(course._id, emptyTs._id, emptyAssessment._id, { reviewerType: 'Team' });
    const emptyDto = await getPeerReviewResultsForAssessmentById(emptyAssessment._id.toString());
    expect(emptyDto.perStudent).toHaveLength(0);
  });

  it('ignores malformed completed grading tasks missing submission id in results aggregation', async () => {
    const course = await makeCourse();
    const ts = await makeTeamSet(course._id);
    const assessment = await makeAssessment(course._id, ts._id);
    const pr = await makePeerReview(course._id, ts._id, assessment._id, {
      reviewerType: 'Individual',
    });

    const student = await makeUser('results-malformed-task-student');
    const team = await makeTeam(ts._id, { number: 12, members: [student._id] });
    await TeamSetModel.findByIdAndUpdate(ts._id, { $set: { teams: [team._id] } });

    const assignment = await makeAssignment(pr._id, team._id);
    const submission = await makeSubmission(pr._id, assignment._id, {
      reviewerKind: 'Student',
      reviewerUserId: student._id,
      status: 'Submitted',
    });

    const gradingFindSpy = jest.spyOn(PeerReviewGradingTaskModel, 'find').mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        { peerReviewSubmissionId: undefined, score: 99 },
        { peerReviewSubmissionId: submission._id, score: 8 },
      ]),
    } as any);

    const dto = await getPeerReviewResultsForAssessmentById(
      assessment._id.toString(),
      'perStudent',
      1,
      10
    );

    expect(dto.perStudent).toHaveLength(1);
    expect(dto.perStudent[0].aggregatedScore).toBe(8);

    gradingFindSpy.mockRestore();
  });

  it('covers results edge branches for missing teamset doc and team reviewer aggregation', async () => {
    const course = await makeCourse();
    const missingTeamSetId = oid();
    const assessmentMissingTs = await makeAssessment(course._id, missingTeamSetId as any, {
      teamSet: missingTeamSetId,
    });
    await makePeerReview(course._id, missingTeamSetId as any, assessmentMissingTs._id, {
      reviewerType: 'Team',
    });

    await expect(
      getPeerReviewResultsForAssessmentById(assessmentMissingTs._id.toString())
    ).rejects.toBeInstanceOf(NotFoundError);

    const ts = await makeTeamSet(course._id);
    const assessment = await makeAssessment(course._id, ts._id);
    const pr = await makePeerReview(course._id, ts._id, assessment._id, { reviewerType: 'Team' });

    const s1 = await makeUser('team-res-1');
    const s2 = await makeUser('team-res-2');
    const team = await makeTeam(ts._id, { number: 2, members: [s1._id, s2._id] });
    const team2 = await makeTeam(ts._id, { number: 3, members: [s2._id] });
    await TeamSetModel.findByIdAndUpdate(ts._id, { $set: { teams: [team._id, team2._id] } });

    await TeamModel.findByIdAndUpdate(team._id, { $unset: { members: 1 } });
    const emptyMembersDto = await getPeerReviewResultsForAssessmentById(
      assessment._id.toString(),
      'perTeam',
      1,
      10
    );
    expect(emptyMembersDto.perTeam[0].members).toHaveLength(0);

    await TeamModel.findByIdAndUpdate(team._id, { $set: { members: [s1._id, s2._id] } });

    const assignment = await makeAssignment(pr._id, team._id);
    const gradedSub = await makeSubmission(pr._id, assignment._id, {
      reviewerKind: 'Team',
      reviewerTeamId: team._id,
      status: 'Submitted',
    });
    await makeSubmission(pr._id, assignment._id, {
      reviewerKind: 'Team',
      reviewerTeamId: team2._id,
      status: 'Submitted',
    });

    await new PeerReviewGradingTaskModel({
      peerReviewId: pr._id,
      peerReviewSubmissionId: gradedSub._id,
      grader: s1._id,
      status: 'Completed',
      score: 10,
    }).save();

    const teamDto = await getPeerReviewResultsForAssessmentById(
      assessment._id.toString(),
      'perTeam',
      1,
      10
    );
    expect(teamDto.perTeam[0].teamAggregatedScore).toBe(10);
  });

  it('covers grading DTO validation and reviewer variants', async () => {
    const user = await makeUser('g-user');
    await expect(
      getPeerReviewGradingDTO(user._id.toString(), COURSE_ROLE.Faculty, oid().toString(), oid().toString())
    ).rejects.toBeInstanceOf(NotFoundError);

    const course = await makeCourse();
    const ts = await makeTeamSet(course._id);
    const nonPr = await makeAssessment(course._id, ts._id, { assessmentType: 'standard' });
    await expect(
      getPeerReviewGradingDTO(user._id.toString(), COURSE_ROLE.Faculty, nonPr._id.toString(), oid().toString())
    ).rejects.toBeInstanceOf(BadRequestError);

    const assessment = await makeAssessment(course._id, ts._id);
    await expect(
      getPeerReviewGradingDTO(user._id.toString(), COURSE_ROLE.Faculty, assessment._id.toString(), oid().toString())
    ).rejects.toBeInstanceOf(NotFoundError);

    const pr = await makePeerReview(course._id, ts._id, assessment._id);
    await expect(
      getPeerReviewGradingDTO(user._id.toString(), COURSE_ROLE.Faculty, assessment._id.toString(), oid().toString())
    ).rejects.toBeInstanceOf(NotFoundError);

    const revieweeTeam = await makeTeam(ts._id, { number: 9 });
    const assignment = await makeAssignment(pr._id, revieweeTeam._id);
    const submission = await makeSubmission(pr._id, assignment._id, {
      reviewerKind: 'Team',
      reviewerTeamId: oid(),
      status: 'Submitted',
    });

    const otherPrAssessment = await makeAssessment(course._id, ts._id);
    const otherPr = await makePeerReview(course._id, ts._id, otherPrAssessment._id);
    const otherAssignment = await makeAssignment(otherPr._id, revieweeTeam._id);
    const mismatchSubmission = await makeSubmission(otherPr._id, otherAssignment._id, {
      reviewerKind: 'Student',
      reviewerUserId: user._id,
    });
    await expect(
      getPeerReviewGradingDTO(
        user._id.toString(),
        COURSE_ROLE.Faculty,
        assessment._id.toString(),
        mismatchSubmission._id.toString()
      )
    ).rejects.toBeInstanceOf(BadRequestError);

    await expect(
      getPeerReviewGradingDTO(user._id.toString(), COURSE_ROLE.Student, assessment._id.toString(), submission._id.toString())
    ).rejects.toBeInstanceOf(MissingAuthorizationError);

    await PeerReviewAssignmentModel.deleteOne({ _id: assignment._id });
    await expect(
      getPeerReviewGradingDTO(user._id.toString(), COURSE_ROLE.Faculty, assessment._id.toString(), submission._id.toString())
    ).rejects.toBeInstanceOf(NotFoundError);

    const assignment2 = await makeAssignment(pr._id, revieweeTeam._id);
    const submission2 = await makeSubmission(pr._id, assignment2._id, {
      reviewerKind: 'Team',
      reviewerTeamId: oid(),
      status: 'Submitted',
    });
    await TeamModel.deleteOne({ _id: revieweeTeam._id });
    await expect(
      getPeerReviewGradingDTO(user._id.toString(), COURSE_ROLE.Faculty, assessment._id.toString(), submission2._id.toString())
    ).rejects.toBeInstanceOf(NotFoundError);

    const revieweeTeam2 = await makeTeam(ts._id, { number: 10 });
    const assignment3 = await makeAssignment(pr._id, revieweeTeam2._id);
    const submission3 = await makeSubmission(pr._id, assignment3._id, {
      reviewerKind: 'Team',
      reviewerTeamId: oid(),
      status: 'Submitted',
    });

    await new PeerReviewGradingTaskModel({
      peerReviewId: pr._id,
      peerReviewSubmissionId: submission3._id,
      grader: user._id,
      status: 'Assigned',
    }).save();

    const facultyDto = await getPeerReviewGradingDTO(
      user._id.toString(),
      COURSE_ROLE.Faculty,
      assessment._id.toString(),
      submission3._id.toString()
    );
    expect(facultyDto.reviewer.kind).toBe('Team');
    expect(facultyDto.myGradingTask?._id).toBeTruthy();
  });

  it('covers remaining fallback branches for unknown refs and nullish values', async () => {
    const faculty = await makeUser('faculty-remaining');
    const taNoTasks = await makeUser('ta-no-tasks-remaining');
    const course = await makeCourse();
    const ts = await makeTeamSet(course._id);
    const assessment = await makeAssessment(course._id, ts._id, { maxMarks: undefined });
    await InternalAssessmentModel.updateOne({ _id: assessment._id }, { $unset: { maxMarks: 1 } });
    const pr = await makePeerReview(course._id, ts._id, assessment._id);

    const taEmptyDto = await getPeerReviewSubmissionsForAssessmentById(
      assessment._id.toString(),
      taNoTasks._id.toString(),
      COURSE_ROLE.TA
    );
    expect(taEmptyDto.maxMarks).toBe(0);

    const reviewee = await makeTeam(ts._id, { number: 55 });
    const assignment = await makeAssignment(pr._id, reviewee._id);

    const unknownTeamId = oid();
    await makeSubmission(pr._id, assignment._id, {
      reviewerKind: 'Team',
      reviewerTeamId: unknownTeamId,
      status: 'Submitted',
    });

    await PeerReviewSubmissionModel.collection.insertOne({
      peerReviewId: pr._id,
      peerReviewAssignmentId: assignment._id,
      reviewerKind: 'Student',
      status: 'Submitted',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const subDto = await getPeerReviewSubmissionsForAssessmentById(
      assessment._id.toString(),
      faculty._id.toString(),
      COURSE_ROLE.Faculty,
      1,
      20
    );
    expect(subDto.maxMarks).toBe(0);
    expect(subDto.items.some(i => i.reviewer.kind === 'Team' && (i.reviewer as any).teamNumber === -1)).toBe(true);
    expect(subDto.items.some(i => i.reviewer.kind === 'User' && (i.reviewer as any).name === 'Unknown')).toBe(true);

    const u1 = await makeUser('results-unknown-name');
    const team = await makeTeam(ts._id, { number: 8, members: [u1._id] });
    await TeamSetModel.findByIdAndUpdate(ts._id, { $set: { teams: [team._id] } });
    await UserModel.updateOne({ _id: u1._id }, { $unset: { name: 1 } });

    const teamResult = await getPeerReviewResultsForAssessmentById(
      assessment._id.toString(),
      'perTeam',
      1,
      10
    );
    expect(teamResult.maxMarks).toBe(0);
    expect(teamResult.perTeam.length).toBe(1);

    const reviewerUser = await makeUser('reviewer-g-unknown');
    const reviewerUserId = reviewerUser._id;
    await UserModel.deleteOne({ _id: reviewerUserId });

    const gradingSubmission = await makeSubmission(pr._id, assignment._id, {
      reviewerKind: 'Student',
      reviewerUserId,
      status: 'Submitted',
    });

    const deletedGrader = await makeUser('deleted-grader');
    const deletedGraderId = deletedGrader._id;
    await new PeerReviewGradingTaskModel({
      peerReviewId: pr._id,
      peerReviewSubmissionId: gradingSubmission._id,
      grader: deletedGraderId,
      status: 'Assigned',
    }).save();
    await UserModel.deleteOne({ _id: deletedGraderId });

    const gradingDto = await getPeerReviewGradingDTO(
      faculty._id.toString(),
      COURSE_ROLE.Faculty,
      assessment._id.toString(),
      gradingSubmission._id.toString()
    );

    expect(gradingDto.maxMarks).toBe(0);
    expect((gradingDto.reviewer as any).name).toBe('Unknown');
    expect(gradingDto.gradingTasks.some(t => t.grader.id === '' && t.grader.name === 'Unknown')).toBe(true);
  });
});
