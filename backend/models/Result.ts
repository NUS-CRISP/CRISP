import mongoose, { Schema } from 'mongoose';

export interface Result {
  assessment: mongoose.Types.ObjectId;
  team: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  markers: mongoose.Types.ObjectId[];
  marks: {student_id : string, mark: number}[];
}

const resultSchema = new Schema<Result>({
  assessment: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true },
  team: { type: Schema.Types.ObjectId, ref: 'Team'},
  user: { type: Schema.Types.ObjectId, ref: 'User'},
  markers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  marks: [{student_id : String, mark: Number}],
});

const ResultModel = mongoose.model<Result>('Result', resultSchema);

export default ResultModel;