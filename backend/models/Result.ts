import { Result as SharedResult } from '@shared/types/Result';
import mongoose, { Document, Schema, Types } from 'mongoose';

export interface Result
  extends Omit<SharedResult, '_id' | 'assessment' | 'team' | 'marker'>, Document {
  _id: Types.ObjectId;
  assessment: Types.ObjectId;
  team?: Types.ObjectId;
  marker?: Types.ObjectId;
}

export const resultSchema = new Schema<Result>({
  assessment: {
    type: Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true,
  },
  team: { type: Schema.Types.ObjectId, ref: 'Team' },
  marker: { type: Schema.Types.ObjectId, ref: 'User' },
  marks: [{ userId: String, name: String, mark: Number }],
});

const ResultModel = mongoose.model<Result>('Result', resultSchema);

export default ResultModel;
