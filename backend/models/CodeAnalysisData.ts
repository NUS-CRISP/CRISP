import { CodeAnalysisData as SharedCodeAnalysisData } from '@shared/types/CodeAnalysisData';
import mongoose, { Schema, Types } from 'mongoose';

export interface CodeAnalysisData
  extends Omit<SharedCodeAnalysisData, '_id'>,
    Document {
  _id: Types.ObjectId;
  metricStats: Map<string, { median: number; mean: number }>;
}

const codeAnalysisDataSchema: Schema = new Schema<CodeAnalysisData>({
  executionTime: { type: Date, required: true },
  gitHubOrgName: { type: String, required: true },
  teamId: { type: Number, required: true },
  repoName: { type: String, required: true },
  metrics: { type: [String], required: true },
  values: { type: [String], required: true },
  types: { type: [String], required: true },
  domains: { type: [String], required: true },
  metricStats: {
    type: Map,
    of: {
      median: Number,
      mean: Number,
    },
  },
});

const codeAnalysisDataModel = mongoose.model<CodeAnalysisData>(
  'codeAnalysis',
  codeAnalysisDataSchema
);

export default codeAnalysisDataModel;
