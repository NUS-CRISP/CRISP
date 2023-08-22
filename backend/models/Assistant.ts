import mongoose, { Schema } from 'mongoose';
import {userSchema, User } from './User';

export interface Assistant extends User {
  isHeadAssistant : boolean;
}

export const assistantSchema = new Schema<Assistant>({
  ...userSchema.obj,
  isHeadAssistant: { type: Boolean, required: true }
});

const AssistantModel = mongoose.model<Assistant>('Assistant', assistantSchema);

export default AssistantModel;