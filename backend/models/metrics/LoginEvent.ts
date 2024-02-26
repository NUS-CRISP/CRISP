import { LoginEvent as SharedLoginEvent } from '@shared/types/metrics/LoginEvent';
import mongoose, { Schema, Types } from 'mongoose';

export interface LoginEvent extends Omit<SharedLoginEvent, 'metadata'> {
  metadata: {
    userId: Types.ObjectId;
  };
}

const loginEventSchema = new Schema<LoginEvent>({
  timestamp: { type: Date, required: true, default: Date.now },
  metadata: {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
});

const LoginEventModel = mongoose.model<LoginEvent>(
  'LoginEvent',
  loginEventSchema
);

export default LoginEventModel;
