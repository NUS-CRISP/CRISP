import { Document, Schema } from 'mongoose';
import QuestionModel from './Question';

export interface BaseQuestion extends Document {
  text: string;
  type: string;
  customInstruction?: string;
  isRequired: boolean;
  isLocked: boolean;
}

export interface NUSNETIDQuestion extends BaseQuestion {
  type: 'NUSNET ID';
  shortResponsePlaceholder: string;
}

const NUSNETIDSchema = new Schema({
  shortResponsePlaceholder: { type: String, required: true },
});

export const NUSNETIDQuestionModel =
  QuestionModel.discriminator<NUSNETIDQuestion>('NUSNET ID', NUSNETIDSchema);

export interface NUSNETEmailQuestion extends BaseQuestion {
  type: 'NUSNET Email';
  shortResponsePlaceholder: string;
}

const NUSNETEmailSchema = new Schema({
  shortResponsePlaceholder: { type: String, required: true },
});

export const NUSNETEmailQuestionModel =
  QuestionModel.discriminator<NUSNETEmailQuestion>(
    'NUSNET Email',
    NUSNETEmailSchema
  );

export interface TeamMemberSelectionQuestion extends BaseQuestion {
  type: 'Team Member Selection';
}

const TeamMemberSelectionSchema = new Schema({
  // No fields because this question is locked, and will always ask for array of userIds in Submission/Answer
});

export const TeamMemberSelectionQuestionModel =
  QuestionModel.discriminator<TeamMemberSelectionQuestion>(
    'Team Member Selection',
    TeamMemberSelectionSchema
  );

export interface MultipleChoiceOption {
  text: string;
  points: number;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'Multiple Choice';
  options: MultipleChoiceOption[];
  isScored: boolean;
}

const MultipleChoiceOptionSchema = new Schema({
  text: { type: String, required: true },
  points: { type: Number, required: true },
});

const MultipleChoiceSchema = new Schema({
  options: { type: [MultipleChoiceOptionSchema], required: true },
  isScored: { type: Boolean, required: true },
});

export const MultipleChoiceQuestionModel =
  QuestionModel.discriminator<MultipleChoiceQuestion>(
    'Multiple Choice',
    MultipleChoiceSchema
  );

export interface MultipleResponseOption {
  text: string;
  points: number; // Points can be negative
}

export interface MultipleResponseQuestion extends BaseQuestion {
  type: 'Multiple Response';
  options: MultipleResponseOption[];
  isScored: boolean;
  allowNegative: boolean;
}

const MultipleResponseOptionSchema = new Schema({
  text: { type: String, required: true },
  points: { type: Number, required: true },
});

// Define the question schema
const MultipleResponseSchema = new Schema({
  options: { type: [MultipleResponseOptionSchema], required: true },
  isScored: { type: Boolean, required: true },
  allowNegative: { type: Boolean, required: true },
});

export const MultipleResponseQuestionModel =
  QuestionModel.discriminator<MultipleResponseQuestion>(
    'Multiple Response',
    MultipleResponseSchema
  );

export interface ScaleLabel {
  value: number;
  label: string;
  points: number;
}

export interface ScaleQuestion extends BaseQuestion {
  type: 'Scale';
  scaleMax: number;
  labels: ScaleLabel[];
  isScored: boolean;
}

const ScaleLabelSchema = new Schema<ScaleLabel>({
  value: { type: Number, required: true },
  label: { type: String, required: true },
  points: { type: Number, required: true },
});

// Define the question schema
const ScaleQuestionSchema = new Schema({
  scaleMax: { type: Number, required: true },
  labels: {
    type: [ScaleLabelSchema],
    required: true,
    validate: {
      validator: function (v: ScaleLabel[]) {
        if (!v || v.length < 2) return false; // At least min and max labels
        const sorted = [...v].sort((a, b) => a.value - b.value);
        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i].value <= sorted[i - 1].value) return false; // Values must be ascending
          if (sorted[i].points < sorted[i - 1].points) return false; // Points must be ascending
        }
        return true;
      },
      message:
        'Labels must have unique scale values, ascending point values, and at least two labels (min and max).',
    },
  },
  isScored: { type: Boolean, required: true },
});

export const ScaleQuestionModel = QuestionModel.discriminator<ScaleQuestion>(
  'Scale',
  ScaleQuestionSchema
);

export interface ShortResponseQuestion extends BaseQuestion {
  type: 'Short Response';
  shortResponsePlaceholder: string;
}

const ShortResponseSchema = new Schema({
  shortResponsePlaceholder: { type: String, required: true },
});

export const ShortResponseQuestionModel =
  QuestionModel.discriminator<ShortResponseQuestion>(
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

export const LongResponseQuestionModel =
  QuestionModel.discriminator<LongResponseQuestion>(
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
export interface NumberScoringRange {
  minValue: number;
  maxValue: number;
  points: number;
}

export interface NumberQuestion extends BaseQuestion {
  type: 'Number';
  maxNumber: number;
  isScored: boolean;
  scoringMethod: 'direct' | 'range' | 'None';
  maxPoints?: number;
  scoringRanges?: NumberScoringRange[];
}

const NumberScoringRangeSchema = new Schema({
  minValue: { type: Number, required: true },
  maxValue: { type: Number, required: true },
  points: { type: Number, required: true },
});

// Define the question schema
const NumberSchema = new Schema({
  maxNumber: { type: Number, required: true },
  isScored: { type: Boolean, required: true },
  scoringMethod: {
    type: String,
    enum: ['direct', 'range', 'None'],
    required: true,
  },
  maxPoints: { type: Number }, // For 'direct' method
  scoringRanges: { type: [NumberScoringRangeSchema] }, // For 'range' method
});
export const NumberQuestionModel = QuestionModel.discriminator<NumberQuestion>(
  'Number',
  NumberSchema
);

export interface UndecidedQuestion extends BaseQuestion {
  type: 'Undecided';
}

const UndecidedSchema = new Schema({});

export const UndecidedQuestionModel =
  QuestionModel.discriminator<UndecidedQuestion>('Undecided', UndecidedSchema);

export type QuestionUnion =
  | TeamMemberSelectionQuestion
  | NUSNETIDQuestion
  | NUSNETEmailQuestion
  | MultipleChoiceQuestion
  | MultipleResponseQuestion
  | ScaleQuestion
  | ShortResponseQuestion
  | LongResponseQuestion
  | DateQuestion
  | NumberQuestion
  | UndecidedQuestion;
