import mongoose, { Schema, Document } from 'mongoose';
import { ObjectId } from 'mongodb';

const options = { discriminatorKey: 'type', timestamps: true };

// BaseAnswer interface
export interface BaseAnswer extends Document {
  question: ObjectId;
  type: string;
  score?: number;
}

// BaseAnswer schema
const BaseAnswerSchema = new Schema<BaseAnswer>(
  {
    question: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    type: { type: String, required: true },
    score: { type: Number, required: false },
  },
  options
);

// AnswerSchema is the base schema that will be used for discriminators
const AnswerSchema = BaseAnswerSchema;

// Discriminator interfaces and schemas
export interface NUSNETIDAnswer extends BaseAnswer {
  value: string;
}

export const NUSNETIDAnswerSchema = new Schema<NUSNETIDAnswer>(
  {
    value: { type: String, required: true },
  },
  options
);

export interface NUSNETEmailAnswer extends BaseAnswer {
  value: string;
}

export const NUSNETEmailAnswerSchema = new Schema<NUSNETEmailAnswer>(
  {
    value: { type: String, required: true },
  },
  options
);

export interface TeamMemberSelectionAnswer extends BaseAnswer {
  selectedUserIds: string[];
}

export const TeamMemberSelectionAnswerSchema = new Schema<TeamMemberSelectionAnswer>(
  {
    selectedUserIds: { type: [String], required: true },
  },
  options
);

export interface MultipleChoiceAnswer extends BaseAnswer {
  value: string;
}

export const MultipleChoiceAnswerSchema = new Schema<MultipleChoiceAnswer>(
  {
    value: { type: String, required: true },
  },
  options
);

export interface MultipleResponseAnswer extends BaseAnswer {
  values: string[];
}

export const MultipleResponseAnswerSchema = new Schema<MultipleResponseAnswer>(
  {
    values: { type: [String], required: true },
  },
  options
);

export interface ScaleAnswer extends BaseAnswer {
  value: number;
}

export const ScaleAnswerSchema = new Schema<ScaleAnswer>(
  {
    value: { type: Number, required: true },
  },
  options
);

export interface ShortResponseAnswer extends BaseAnswer {
  value: string;
}

export const ShortResponseAnswerSchema = new Schema<ShortResponseAnswer>(
  {
    value: { type: String, required: true },
  },
  options
);

export interface LongResponseAnswer extends BaseAnswer {
  value: string;
}

export const LongResponseAnswerSchema = new Schema<LongResponseAnswer>(
  {
    value: { type: String, required: true },
  },
  options
);

export interface DateAnswer extends BaseAnswer {
  value?: Date;
  startDate?: Date;
  endDate?: Date;
}

export const DateAnswerSchema = new Schema<DateAnswer>(
  {
    value: { type: Date },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  options
);

export interface NumberAnswer extends BaseAnswer {
  value: number;
}

export const NumberAnswerSchema = new Schema<NumberAnswer>(
  {
    value: { type: Number, required: true },
  },
  options
);

export interface UndecidedAnswer extends BaseAnswer {
  // No additional fields
}

export const UndecidedAnswerSchema = new Schema<UndecidedAnswer>({}, options);

export const AnswerModel = mongoose.model<BaseAnswer>('Answer', AnswerSchema);

export const NUSNETIDAnswerModel = AnswerModel.discriminator<NUSNETIDAnswer>(
  'NUSNET ID Answer',
  NUSNETIDAnswerSchema
);

export const NUSNETEmailAnswerModel = AnswerModel.discriminator<NUSNETEmailAnswer>(
  'NUSNET Email Answer',
  NUSNETEmailAnswerSchema
);

export const TeamMemberSelectionAnswerModel = AnswerModel.discriminator<TeamMemberSelectionAnswer>(
  'Team Member Selection Answer',
  TeamMemberSelectionAnswerSchema
);

export const MultipleChoiceAnswerModel = AnswerModel.discriminator<MultipleChoiceAnswer>(
  'Multiple Choice Answer',
  MultipleChoiceAnswerSchema
);

export const MultipleResponseAnswerModel = AnswerModel.discriminator<MultipleResponseAnswer>(
  'Multiple Response Answer',
  MultipleResponseAnswerSchema
);

export const ScaleAnswerModel = AnswerModel.discriminator<ScaleAnswer>(
  'Scale Answer',
  ScaleAnswerSchema
);

export const ShortResponseAnswerModel = AnswerModel.discriminator<ShortResponseAnswer>(
  'Short Response Answer',
  ShortResponseAnswerSchema
);

export const LongResponseAnswerModel = AnswerModel.discriminator<LongResponseAnswer>(
  'Long Response Answer',
  LongResponseAnswerSchema
);

export const DateAnswerModel = AnswerModel.discriminator<DateAnswer>(
  'Date Answer',
  DateAnswerSchema
);

export const NumberAnswerModel = AnswerModel.discriminator<NumberAnswer>(
  'Number Answer',
  NumberAnswerSchema
);

export const UndecidedAnswerModel = AnswerModel.discriminator<UndecidedAnswer>(
  'Undecided Answer',
  UndecidedAnswerSchema
);

// Union type for all possible answer types
export type AnswerUnion =
  | NUSNETIDAnswer
  | NUSNETEmailAnswer
  | TeamMemberSelectionAnswer
  | MultipleChoiceAnswer
  | MultipleResponseAnswer
  | ScaleAnswer
  | ShortResponseAnswer
  | LongResponseAnswer
  | DateAnswer
  | NumberAnswer
  | UndecidedAnswer;

export default AnswerSchema;
