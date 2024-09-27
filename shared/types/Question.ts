// @shared/types/Question.ts

export interface BaseQuestion {
  _id: string;
  text: string;
  type: string; // Discriminator property
  customInstruction?: string;
  isLocked: boolean; // Indicates if the question is locked
}

// Multiple Choice Question
export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'Multiple Choice';
  options: string[];
}

// Multiple Response Question
export interface MultipleResponseQuestion extends BaseQuestion {
  type: 'Multiple Response';
  options: string[];
}

// Scale Question
export interface ScaleQuestion extends BaseQuestion {
  type: 'Scale';
  scaleMax: number;
  labelMin: string;
  labelMax: string;
}

// Short Response Question
export interface ShortResponseQuestion extends BaseQuestion {
  type: 'Short Response';
  shortResponsePlaceholder?: string;
}

// Long Response Question
export interface LongResponseQuestion extends BaseQuestion {
  type: 'Long Response';
  longResponsePlaceholder?: string;
}

// Date Question
export interface DateQuestion extends BaseQuestion {
  type: 'Date';
  isRange: boolean; // Determines if it's a single date or date range
  datePickerPlaceholder?: string; // Placeholder text for the date picker
  minDate?: Date; // Minimum selectable date
  maxDate?: Date; // Maximum selectable date
}

// Number Question
export interface NumberQuestion extends BaseQuestion {
  type: 'Number';
  maxNumber: number;
}

// Undecided Question (used when the type is not yet chosen)
export interface UndecidedQuestion extends BaseQuestion {
  type: 'Undecided';
}

// Union Type for all Question Types
export type QuestionUnion =
  | MultipleChoiceQuestion
  | MultipleResponseQuestion
  | ScaleQuestion
  | ShortResponseQuestion
  | LongResponseQuestion
  | DateQuestion
  | NumberQuestion
  | UndecidedQuestion;

export type QuestionData = QuestionUnion;
