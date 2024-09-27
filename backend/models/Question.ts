// models/Question.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface Question extends Document {
  text: string;
  type: string;
  customInstruction?: string;
  isLocked?: boolean; // Indicates if the question is locked
}

const options = { discriminatorKey: 'type', timestamps: true };

const QuestionSchema = new Schema<Question>(
  {
    text: { type: String, required: true },
    type: { type: String, required: true },
    customInstruction: { type: String },
    isLocked: { type: Boolean, default: false },
  },
  options
);

const QuestionModel = mongoose.model<Question>('Question', QuestionSchema);

export default QuestionModel;

