import mongoose, { Schema } from 'mongoose';
import {basePersonSchema, BasePerson } from './BasePerson';

export interface Assistant extends BasePerson {
  isHeadAssistant : boolean;
}

export const assistantSchema = new Schema<Assistant>({
  ...basePersonSchema.obj,
  isHeadAssistant: { type: Boolean, required: true }
});

const AssistantModel = mongoose.model<Assistant>('Assistant', assistantSchema);

export default AssistantModel;