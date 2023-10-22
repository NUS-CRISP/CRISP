import mongoose, { Schema, Types } from 'mongoose';
import { Mark, Result as SharedResult } from '@shared/types/Result';

export interface Result
  extends Omit<
    SharedResult,
    'assessment' | 'team' | 'user' | 'markers' | 'marks'
  > {
  assessment: Types.ObjectId;
  team?: Types.ObjectId;
  user?: Types.ObjectId;
  markers?: Types.ObjectId[];
  marks?: Mark[];
}

const resultSchema = new Schema<Result>({
  assessment: {
    type: Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true,
  },
  team: { type: Schema.Types.ObjectId, ref: 'Team' },
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  markers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  marks: [{ userId: String, mark: Number }],
});

export default mongoose.model<Result>('Result', resultSchema);
