import { TabSession as SharedTabSession } from '@shared/types/metrics/TabSession';
import mongoose, { Schema, Types } from 'mongoose';

export interface TabSession
  extends Omit<SharedTabSession, 'account' | 'course'> {
  account: Types.ObjectId;
  course: Types.ObjectId;
}

const TabSessionSchema = new Schema({
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  tab: {
    type: String,
    required: true,
  },
  sessionStartTime: {
    type: Date,
    required: true,
  },
  sessionEndTime: {
    type: Date,
    required: true,
  },
  sessionDuration: {
    type: Number,
    required: true,
  },
  sessionId: {
    type: String,
    required: true,
  },
});

const TabSessionModel = mongoose.model('TabSession', TabSessionSchema);

export default TabSessionModel;
