import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { ConnectOptions, Types } from 'mongoose';

import CourseModel from '../../models/Course';
import TeamSetModel from '../../models/TeamSet';
import TeamModel from '../../models/Team';
import PeerReviewModel from '../../models/PeerReview';
import PeerReviewAssignmentModel from '../../models/PeerReviewAssignment';

let mongoServer: MongoMemoryServer;

let testCourseId: Types.ObjectId;
let testTeamSetId: Types.ObjectId;
let testPeerReviewId: Types.ObjectId;
let testRevieweeTeamId: Types.ObjectId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as ConnectOptions);
});

beforeEach(async () => {
  await PeerReviewAssignmentModel.deleteMany({});
  await PeerReviewModel.deleteMany({});
  await TeamModel.deleteMany({});
  await TeamSetModel.deleteMany({});
  await CourseModel.deleteMany({});

  const course = await new CourseModel({
    name: 'Test Course',
    code: 'TEST1234',
    semester: 'Spring 2023',
    startDate: new Date('2024-08-15'),
    courseType: 'Normal',
  }).save();
  testCourseId = course._id;

  const teamSet = await new TeamSetModel({
    name: 'Test TeamSet',
    course: course._id,
  }).save();
  testTeamSetId = teamSet._id;

  const now = Date.now();
  const peerReview = await new PeerReviewModel({
    course: testCourseId,
    teamSetId: testTeamSetId,
    title: 'PR Title',
    description: 'PR Desc',
    startDate: new Date(now + 60_000),
    endDate: new Date(now + 120_000),
    taAssignments: false,
    reviewerType: 'Individual',
    minReviewsPerReviewer: 1,
    maxReviewsPerReviewer: 2,
  }).save();
  testPeerReviewId = peerReview._id;

  const revieweeTeam = await new TeamModel({
    teamSet: testTeamSetId,
    number: 1,
  }).save();
  testRevieweeTeamId = revieweeTeam._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('PeerReviewAssignmentModel', () => {
  const makeValidAssignment = (
    overrides: Partial<Record<string, any>> = {}
  ) => {
    return {
      peerReviewId: testPeerReviewId,
      reviewee: testRevieweeTeamId,
      repoName: 'team-repo',
      repoUrl: 'https://github.com/org/team-repo',
      deadline: null,
      ...overrides,
    };
  };

  it('should create and save a valid peer review assignment', async () => {
    const a = new PeerReviewAssignmentModel(makeValidAssignment());
    const saved = await a.save();

    expect(saved.peerReviewId.toString()).toBe(testPeerReviewId.toString());
    expect(saved.reviewee.toString()).toBe(testRevieweeTeamId.toString());
    expect(saved.repoName).toBe('team-repo');
    expect(saved.repoUrl).toBe('https://github.com/org/team-repo');
    expect(saved.deadline).toBeNull();
  });

  it('should default deadline to null when not provided', async () => {
    const a = new PeerReviewAssignmentModel(
      makeValidAssignment({ deadline: undefined })
    );
    const saved = await a.save();

    expect(saved.deadline).toBeNull();
  });

  it('should not save without required fields', async () => {
    const a = new PeerReviewAssignmentModel({
      // missing peerReviewId, repoName, repoUrl, reviewee
      deadline: null,
    });

    await expect(a.save()).rejects.toThrow();
  });

  it('should enforce required peerReviewId', async () => {
    const a = new PeerReviewAssignmentModel(
      makeValidAssignment({ peerReviewId: undefined })
    );
    await expect(a.save()).rejects.toThrow(/peerReviewId/);
  });

  it('should enforce required reviewee', async () => {
    const a = new PeerReviewAssignmentModel(
      makeValidAssignment({ reviewee: undefined })
    );
    await expect(a.save()).rejects.toThrow(/reviewee/);
  });

  it('should enforce required repoName', async () => {
    const a = new PeerReviewAssignmentModel(
      makeValidAssignment({ repoName: undefined })
    );
    await expect(a.save()).rejects.toThrow(/repoName/);
  });

  it('should enforce required repoUrl', async () => {
    const a = new PeerReviewAssignmentModel(
      makeValidAssignment({ repoUrl: undefined })
    );
    await expect(a.save()).rejects.toThrow(/repoUrl/);
  });

  it('should enforce unique (peerReviewId, reviewee) index', async () => {
    await new PeerReviewAssignmentModel(makeValidAssignment()).save();

    // attempt to insert same peerReviewId + reviewee again
    const dup = new PeerReviewAssignmentModel(
      makeValidAssignment({
        repoName: 'other',
        repoUrl: 'https://github.com/x/y',
      })
    );

    await expect(dup.save()).rejects.toThrow(/duplicate key/i);
  });

  it('should allow same reviewee in different peerReviewId', async () => {
    const now = Date.now();
    const otherPeerReview = await new PeerReviewModel({
      course: testCourseId,
      teamSetId: testTeamSetId,
      title: 'PR Title 2',
      startDate: new Date(now + 60_000),
      endDate: new Date(now + 120_000),
      taAssignments: false,
      reviewerType: 'Individual',
      minReviewsPerReviewer: 1,
      maxReviewsPerReviewer: 2,
    }).save();

    await new PeerReviewAssignmentModel(makeValidAssignment()).save();

    const ok = await new PeerReviewAssignmentModel(
      makeValidAssignment({
        peerReviewId: otherPeerReview._id,
        repoName: 'team-repo-2',
        repoUrl: 'https://github.com/org/team-repo-2',
      })
    ).save();

    expect(ok.peerReviewId.toString()).toBe(otherPeerReview._id.toString());
  });

  it('should update an existing assignment', async () => {
    const a = await new PeerReviewAssignmentModel(makeValidAssignment()).save();

    const updated = await PeerReviewAssignmentModel.findByIdAndUpdate(
      a._id,
      { repoName: 'updated-repo' },
      { new: true }
    );

    expect(updated?.repoName).toBe('updated-repo');
  });

  it('should delete an existing assignment', async () => {
    const a = await new PeerReviewAssignmentModel(makeValidAssignment()).save();

    await PeerReviewAssignmentModel.deleteOne({ _id: a._id });
    const found = await PeerReviewAssignmentModel.findById(a._id);

    expect(found).toBeNull();
  });
});
