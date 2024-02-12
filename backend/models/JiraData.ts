import { Epic, JiraLocation, JiraData as SharedJiraData } from '@shared/types/JiraData';
import mongoose, { Schema, Types } from 'mongoose';

export interface JiraData extends Omit<SharedJiraData, '_id'>, Document {
  _id: Types.ObjectId;
}

const jiraLocationSchema: Schema = new Schema<JiraLocation>({
  projectId: { type: Number, required: true },
  displayName: { type: String, required: true },
  projectName: { type: String, required: true },
  projectKey: { type: String, required: true },
  projectTypeKey: { type: String, required: true },
  avatarURI: { type: String, required: true },
  name: { type: String, required: true }
});

const epicSchema: Schema = new Schema<Epic>({
  id: { type: Number, required: true },
  key: { type: String, required: true },
  self: { type: String, required: true },
  name: { type: String, required: true },
  summary: { type: String, required: true },
  color: {
    key: { type: String, required: true }
  },
  issueColor: {
    key: { type: String, required: true }
  },
  done: { type: Boolean, required: true }
});

const jiraSchema: Schema = new Schema<JiraData>({
  id: { type: Number, required: true },
  self: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  jiraLocation: { type: jiraLocationSchema, required: true },
  epics: { type: [epicSchema], default: [] }
});

const JiraDataModel = mongoose.model<JiraData>('JiraData', jiraSchema);

export default JiraDataModel;
