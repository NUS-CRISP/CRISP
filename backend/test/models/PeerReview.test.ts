import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { ConnectOptions, Types } from 'mongoose';
import CourseModel from '../../models/Course';
import TeamSetModel from '../../models/TeamSet';
import PeerReviewModel from '../../models/PeerReview';

let mongoServer: MongoMemoryServer;

let testCourseId: Types.ObjectId;
let testTeamSetId: Types.ObjectId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as ConnectOptions);
});

beforeEach(async () => {
  await PeerReviewModel.deleteMany({});
  await TeamSetModel.deleteMany({});
  await CourseModel.deleteMany({});

  const course = await new CourseModel({
    name: 'Test Course',
    code: 'TEST1234',
    semester: 'Spring 2026',
    startDate: new Date('2026-01-01'),
    courseType: 'Normal',
  }).save();

  const teamSet = await new TeamSetModel({
    name: 'Test TeamSet',
    course: course._id,
  }).save();

  testCourseId = course._id;
  testTeamSetId = teamSet._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('PeerReviewModel', () => {
  const makeValidPeerReview = (
    overrides: Partial<Record<string, any>> = {}
  ) => {
    const now = Date.now();
    const startDate = new Date(now + 60000); // 1 min future
    const endDate = new Date(now + 120000); // 2 min future

    return {
      course: testCourseId,
      teamSetId: testTeamSetId,
      title: 'PR Title',
      description: 'PR Desc',
      startDate,
      endDate,
      reviewerType: 'Individual',
      taAssignments: false,
      minReviewsPerReviewer: 1,
      maxReviewsPerReviewer: 2,
      // status omitted to test default unless overridden
      ...overrides,
    };
  };

  it('should create and save a valid peer review', async () => {
    const pr = new PeerReviewModel(makeValidPeerReview());
    const saved = await pr.save();

    expect(saved.course.toString()).toBe(testCourseId.toString());
    expect(saved.teamSetId.toString()).toBe(testTeamSetId.toString());
    expect(saved.title).toBe('PR Title');
    expect(saved.reviewerType).toBe('Individual');
  });

  it('should default status to Upcoming', async () => {
    const pr = new PeerReviewModel(makeValidPeerReview({ status: undefined }));
    const saved = await pr.save();
    expect(saved.status).toBe('Upcoming');
  });

  it('should default reviewerType to Individual', async () => {
    const pr = new PeerReviewModel(
      makeValidPeerReview({ reviewerType: undefined })
    );
    const saved = await pr.save();
    expect(saved.reviewerType).toBe('Individual');
  });

  it('should not save without required fields', async () => {
    const pr = new PeerReviewModel({
      // missing course, title, startDate, endDate, teamSetId, etc.
      minReviewsPerReviewer: 1,
      maxReviewsPerReviewer: 2,
      taAssignments: false,
    });

    await expect(pr.save()).rejects.toThrow();
  });

  it('should enforce endDate after startDate', async () => {
    const now = Date.now();
    const pr = new PeerReviewModel(
      makeValidPeerReview({
        startDate: new Date(now + 120000),
        endDate: new Date(now + 60000),
      })
    );

    await expect(pr.save()).rejects.toThrow(
      /end date must be in the future and after start date/i
    );
  });

  it('should enforce endDate in the future', async () => {
    const now = Date.now();
    const pr = new PeerReviewModel(
      makeValidPeerReview({
        startDate: new Date(now - 120000),
        endDate: new Date(now - 60000),
      })
    );

    await expect(pr.save()).rejects.toThrow(
      /end date must be in the future and after start date/i
    );
  });

  it('should enforce minReviewsPerReviewer >= 0', async () => {
    const pr = new PeerReviewModel(
      makeValidPeerReview({ minReviewsPerReviewer: -1 })
    );
    await expect(pr.save()).rejects.toThrow(/minReviewsPerReviewer/i);
  });

  it('should enforce maxReviewsPerReviewer >= 1', async () => {
    const pr = new PeerReviewModel(
      makeValidPeerReview({ maxReviewsPerReviewer: 0 })
    );
    await expect(pr.save()).rejects.toThrow(/maxReviewsPerReviewer/i);
  });

  it('should enforce maxReviewsPerReviewer >= minReviewsPerReviewer', async () => {
    const pr = new PeerReviewModel(
      makeValidPeerReview({
        minReviewsPerReviewer: 3,
        maxReviewsPerReviewer: 2,
      })
    );

    await expect(pr.save()).rejects.toThrow(
      /maxReviewsPerReviewer must be greater than or equal to minReviewsPerReviewer/i
    );
  });

  it('should compute computedStatus = Upcoming when now < startDate', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));

    const pr = await new PeerReviewModel(
      makeValidPeerReview({
        startDate: new Date('2030-01-02T00:00:00.000Z'),
        endDate: new Date('2030-01-03T00:00:00.000Z'),
      })
    );

    expect(pr.computedStatus).toBe('Upcoming');
    jest.useRealTimers();
  });

  it('should compute computedStatus = Active when startDate <= now <= endDate', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2030-01-02T12:00:00.000Z'));

    const pr = await new PeerReviewModel(
      makeValidPeerReview({
        startDate: new Date('2030-01-02T00:00:00.000Z'),
        endDate: new Date('2030-01-03T00:00:00.000Z'),
      })
    );

    expect(pr.computedStatus).toBe('Active');
    jest.useRealTimers();
  });

  it('should compute computedStatus = Closed when now > endDate', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2030-01-04T00:00:00.000Z'));

    const pr = await new PeerReviewModel(
      makeValidPeerReview({
        startDate: new Date('2030-01-02T00:00:00.000Z'),
        endDate: new Date('2030-01-03T00:00:00.000Z'),
      })
    );

    expect(pr.computedStatus).toBe('Closed');
    jest.useRealTimers();
  });

  it('should include computedStatus in JSON (virtuals enabled)', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2030-01-02T12:00:00.000Z'));

    const pr = await new PeerReviewModel(
      makeValidPeerReview({
        startDate: new Date('2030-01-02T00:00:00.000Z'),
        endDate: new Date('2030-01-03T00:00:00.000Z'),
      })
    );

    const json = pr.toJSON() as any;
    expect(json.computedStatus).toBe('Active');

    jest.useRealTimers();
  });

  it('should update an existing peer review', async () => {
    const pr = await new PeerReviewModel(makeValidPeerReview()).save();

    const updated = await PeerReviewModel.findByIdAndUpdate(
      pr._id,
      { title: 'Updated Title' },
      { new: true }
    );

    expect(updated).not.toBeNull();
    expect(updated?.title).toBe('Updated Title');
  });

  it('should delete an existing peer review', async () => {
    const pr = await new PeerReviewModel(makeValidPeerReview()).save();

    await PeerReviewModel.deleteOne({ _id: pr._id });
    const found = await PeerReviewModel.findById(pr._id);

    expect(found).toBeNull();
  });
});
