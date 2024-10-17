import { Schema, Document } from 'mongoose';
import { ObjectId } from 'mongodb';

const options = { discriminatorKey: 'type', _id: false };

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

const NUSNETIDAnswerSchema = new Schema<NUSNETIDAnswer>(
  {
    value: { type: String, required: true },
  },
  options
);

export interface NUSNETEmailAnswer extends BaseAnswer {
  value: string;
}

const NUSNETEmailAnswerSchema = new Schema<NUSNETEmailAnswer>(
  {
    value: { type: String, required: true },
  },
  options
);

export interface TeamMemberSelectionAnswer extends BaseAnswer {
  selectedUserIds: string[];
}

const TeamMemberSelectionAnswerSchema = new Schema<TeamMemberSelectionAnswer>(
  {
    selectedUserIds: { type: [String], required: true },
  },
  options
);

export interface MultipleChoiceAnswer extends BaseAnswer {
  value: string;
}

const MultipleChoiceAnswerSchema = new Schema<MultipleChoiceAnswer>(
  {
    value: { type: String, required: true },
  },
  options
);

export interface MultipleResponseAnswer extends BaseAnswer {
  values: string[];
}

const MultipleResponseAnswerSchema = new Schema<MultipleResponseAnswer>(
  {
    values: { type: [String], required: true },
  },
  options
);

export interface ScaleAnswer extends BaseAnswer {
  value: number;
}

const ScaleAnswerSchema = new Schema<ScaleAnswer>(
  {
    value: { type: Number, required: true },
  },
  options
);

export interface ShortResponseAnswer extends BaseAnswer {
  value: string;
}

const ShortResponseAnswerSchema = new Schema<ShortResponseAnswer>(
  {
    value: { type: String, required: true },
  },
  options
);

export interface LongResponseAnswer extends BaseAnswer {
  value: string;
}

const LongResponseAnswerSchema = new Schema<LongResponseAnswer>(
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

const DateAnswerSchema = new Schema<DateAnswer>(
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

const NumberAnswerSchema = new Schema<NumberAnswer>(
  {
    value: { type: Number, required: true },
  },
  options
);

export interface UndecidedAnswer extends BaseAnswer {
  // No additional fields
}

const UndecidedAnswerSchema = new Schema<UndecidedAnswer>({}, options);

// Define discriminators without specifying the generic type parameter
AnswerSchema.discriminator('NUSNET ID', NUSNETIDAnswerSchema);
AnswerSchema.discriminator('NUSNET Email', NUSNETEmailAnswerSchema);
AnswerSchema.discriminator('Team Member Selection', TeamMemberSelectionAnswerSchema);
AnswerSchema.discriminator('Multiple Choice', MultipleChoiceAnswerSchema);
AnswerSchema.discriminator('Multiple Response', MultipleResponseAnswerSchema);
AnswerSchema.discriminator('Scale', ScaleAnswerSchema);
AnswerSchema.discriminator('Short Response', ShortResponseAnswerSchema);
AnswerSchema.discriminator('Long Response', LongResponseAnswerSchema);
AnswerSchema.discriminator('Date', DateAnswerSchema);
AnswerSchema.discriminator('Number', NumberAnswerSchema);
AnswerSchema.discriminator('Undecided', UndecidedAnswerSchema);

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
