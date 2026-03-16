import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { ConnectOptions, Types } from 'mongoose';
import NotificationDispatchLogModel from '../../models/NotificationDispatchLog';

let mongoServer: MongoMemoryServer;

const mockPeerReviewId = new Types.ObjectId();
const mockAccountId = new Types.ObjectId();

const makeValidLog = (overrides: Partial<Record<string, any>> = {}) => ({
  eventType: 'PR_ENDS_IN_X_DAYS',
  peerReviewId: mockPeerReviewId,
  accountId: mockAccountId,
  channel: 'email' as const,
  windowKey: 'd-1',
  ...overrides,
});

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as ConnectOptions);
});

beforeEach(async () => {
  await NotificationDispatchLogModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('NotificationDispatchLogModel', () => {
  it('should create and save a valid log entry', async () => {
    const log = new NotificationDispatchLogModel(makeValidLog());
    const saved = await log.save();

    expect(saved.eventType).toBe('PR_ENDS_IN_X_DAYS');
    expect(saved.peerReviewId.toString()).toBe(mockPeerReviewId.toString());
    expect(saved.accountId.toString()).toBe(mockAccountId.toString());
    expect(saved.channel).toBe('email');
    expect(saved.windowKey).toBe('d-1');
    expect(saved.sentAt).toBeInstanceOf(Date);
  });

  it('should default sentAt to the current time when not provided', async () => {
    const before = new Date();
    const log = new NotificationDispatchLogModel(makeValidLog({ sentAt: undefined }));
    const saved = await log.save();
    const after = new Date();

    expect(saved.sentAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(saved.sentAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should add timestamps (createdAt, updatedAt) automatically', async () => {
    const log = new NotificationDispatchLogModel(makeValidLog());
    const saved = await log.save();

    expect((saved as any).createdAt).toBeInstanceOf(Date);
    expect((saved as any).updatedAt).toBeInstanceOf(Date);
  });

  it('should not save without eventType', async () => {
    const log = new NotificationDispatchLogModel(makeValidLog({ eventType: undefined }));
    await expect(log.save()).rejects.toThrow();
  });

  it('should not save without peerReviewId', async () => {
    const log = new NotificationDispatchLogModel(makeValidLog({ peerReviewId: undefined }));
    await expect(log.save()).rejects.toThrow();
  });

  it('should not save without accountId', async () => {
    const log = new NotificationDispatchLogModel(makeValidLog({ accountId: undefined }));
    await expect(log.save()).rejects.toThrow();
  });

  it('should not save without windowKey', async () => {
    const log = new NotificationDispatchLogModel(makeValidLog({ windowKey: undefined }));
    await expect(log.save()).rejects.toThrow();
  });

  it('should not save with an invalid channel value', async () => {
    const log = new NotificationDispatchLogModel(makeValidLog({ channel: 'sms' }));
    await expect(log.save()).rejects.toThrow();
  });

  it('should accept telegram as a valid channel', async () => {
    const log = new NotificationDispatchLogModel(makeValidLog({ channel: 'telegram' }));
    const saved = await log.save();
    expect(saved.channel).toBe('telegram');
  });

  it('should reject duplicate entries with the same compound key', async () => {
    await new NotificationDispatchLogModel(makeValidLog()).save();
    const duplicate = new NotificationDispatchLogModel(makeValidLog());
    await expect(duplicate.save()).rejects.toThrow();
  });

  it('should allow same event for the same account via different channels', async () => {
    await new NotificationDispatchLogModel(makeValidLog({ channel: 'email' })).save();
    const telegramLog = new NotificationDispatchLogModel(makeValidLog({ channel: 'telegram' }));
    await expect(telegramLog.save()).resolves.toBeDefined();
  });

  it('should allow same event and channel with a different windowKey', async () => {
    await new NotificationDispatchLogModel(makeValidLog({ windowKey: 'd-1' })).save();
    const otherWindow = new NotificationDispatchLogModel(makeValidLog({ windowKey: 'd-3' }));
    await expect(otherWindow.save()).resolves.toBeDefined();
  });

  it('should allow same event and channel for a different account', async () => {
    await new NotificationDispatchLogModel(makeValidLog()).save();
    const otherAccount = new NotificationDispatchLogModel(
      makeValidLog({ accountId: new Types.ObjectId() })
    );
    await expect(otherAccount.save()).resolves.toBeDefined();
  });

  it('should allow same event and channel for a different peer review', async () => {
    await new NotificationDispatchLogModel(makeValidLog()).save();
    const otherPR = new NotificationDispatchLogModel(
      makeValidLog({ peerReviewId: new Types.ObjectId() })
    );
    await expect(otherPR.save()).resolves.toBeDefined();
  });

  it('should allow different event types with the same remaining fields', async () => {
    await new NotificationDispatchLogModel(makeValidLog({ eventType: 'PR_ENDS_IN_X_DAYS' })).save();
    const otherEvent = new NotificationDispatchLogModel(
      makeValidLog({ eventType: 'DRAFTS_NEAR_DEADLINE' })
    );
    await expect(otherEvent.save()).resolves.toBeDefined();
  });

  it('should update an existing log entry', async () => {
    const log = await new NotificationDispatchLogModel(makeValidLog()).save();

    const newSentAt = new Date(Date.now() + 5000);
    const updated = await NotificationDispatchLogModel.findByIdAndUpdate(
      log._id,
      { sentAt: newSentAt },
      { new: true }
    );

    expect(updated).not.toBeNull();
    expect(updated?.sentAt.getTime()).toBe(newSentAt.getTime());
  });

  it('should delete an existing log entry', async () => {
    const log = await new NotificationDispatchLogModel(makeValidLog()).save();

    await NotificationDispatchLogModel.deleteOne({ _id: log._id });
    const found = await NotificationDispatchLogModel.findById(log._id);

    expect(found).toBeNull();
  });
});
