import mongoose, { Schema } from 'mongoose';
import {userSchema, User } from './User';

export interface Assistant extends User {
  isHeadAssistant : boolean;
  teamNumber: number;
}

export const assistantSchema = new Schema<Assistant>({
  ...userSchema.obj,
  isHeadAssistant: { type: Boolean, required: true },
  teamNumber: { type: Number }
});

const AssistantModel = mongoose.model<Assistant>('Assistant', assistantSchema);

export default AssistantModel;