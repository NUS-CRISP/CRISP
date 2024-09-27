import { Document, Schema } from 'mongoose';
import QuestionModel from './Question';

export interface BaseQuestion extends Document {
  text: string;
  type: string;
  customInstruction?: string;
  isLocked: boolean;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'Multiple Choice';
  options: string[];
}

const MultipleChoiceSchema = new Schema({
  options: { type: [String], required: true },
});

export const MultipleChoiceQuestionModel = QuestionModel.discriminator<MultipleChoiceQuestion>(
  'Multiple Choice',
  MultipleChoiceSchema
);

export interface MultipleResponseQuestion extends BaseQuestion {
  type: 'Multiple Response';
  options: string[];
}

const MultipleResponseSchema = new Schema({
  options: { type: [String], required: true },
});

export const MultipleResponseQuestionModel = QuestionModel.discriminator<MultipleResponseQuestion>(
  'Multiple Response',
  MultipleResponseSchema
);

export interface ScaleQuestion extends BaseQuestion {
  type: 'Scale';
  scaleMax: number;
  labelMin: string;
  labelMax: string;
}

const ScaleSchema = new Schema({
  scaleMax: { type: Number, required: true },
  labelMin: { type: String, required: true },
  labelMax: { type: String, required: true },
});

export const ScaleQuestionModel = QuestionModel.discriminator<ScaleQuestion>(
  'Scale',
  ScaleSchema
);

export interface ShortResponseQuestion extends BaseQuestion {
  type: 'Short Response';
  shortResponsePlaceholder: string;
}

const ShortResponseSchema = new Schema({
  shortResponsePlaceholder: { type: String, required: true },
});

export const ShortResponseQuestionModel = QuestionModel.discriminator<ShortResponseQuestion>(
  'Short Response',
  ShortResponseSchema
);

export interface LongResponseQuestion extends BaseQuestion {
  type: 'Long Response';
  longResponsePlaceholder: string;
}

const LongResponseSchema = new Schema({
  longResponsePlaceholder: { type: String, required: true },
});

export const LongResponseQuestionModel = QuestionModel.discriminator<LongResponseQuestion>(
  'Long Response',
  LongResponseSchema
);

export interface DateQuestion extends BaseQuestion {
  type: 'Date';
  isRange: boolean;
  datePickerPlaceholder?: string;
  minDate?: Date;
  maxDate?: Date;
}

const DateQuestionSchema = new Schema({
  isRange: { type: Boolean, required: true },
  datePickerPlaceholder: { type: String, required: false },
  minDate: { type: Date, required: false },
  maxDate: { type: Date, required: false },
});

export const DateQuestionModel = QuestionModel.discriminator<DateQuestion>(
  'Date',
  DateQuestionSchema
);

export interface NumberQuestion extends BaseQuestion {
  type: 'Number';
  maxNumber: number;
}

const NumberSchema = new Schema({
  maxNumber: { type: Number, required: true },
});

export const NumberQuestionModel = QuestionModel.discriminator<NumberQuestion>(
  'Number',
  NumberSchema
);

export interface UndecidedQuestion extends BaseQuestion {
  type: 'Undecided';
}

const UndecidedSchema = new Schema({});

export const UndecidedQuestionModel = QuestionModel.discriminator<UndecidedQuestion>(
  'Undecided',
  UndecidedSchema
);

export type QuestionUnion =
  | MultipleChoiceQuestion
  | MultipleResponseQuestion
  | ScaleQuestion
  | ShortResponseQuestion
  | LongResponseQuestion
  | DateQuestion
  | NumberQuestion
  | UndecidedQuestion;
