// Base Question Interface
export interface BaseQuestion {
  _id: string;
  text: string;
  type: string; // Discriminator property
  customInstruction?: string;
  isRequired: boolean;
  isLocked: boolean; // Indicates if the question is locked
}

// NUSNET ID Question
export interface NUSNETIDQuestion extends BaseQuestion {
  type: 'NUSNET ID';
  shortResponsePlaceholder?: string;
}

// NUSNET Email Question
export interface NUSNETEmailQuestion extends BaseQuestion {
  type: 'NUSNET Email';
  shortResponsePlaceholder?: string;
}

// Team Member Selection Question
export interface TeamMemberSelectionQuestion extends BaseQuestion {
  type: 'Team Member Selection';
  // No scoring fields, as per requirements
}

// Multiple Choice Option Interface
export interface MultipleChoiceOption {
  text: string;
  points: number; // Points assigned to this option
}

// Multiple Choice Question
export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'Multiple Choice';
  options: MultipleChoiceOption[];
  isScored: boolean; // Toggle for scoring
}

// Multiple Response Option Interface
export interface MultipleResponseOption {
  text: string;
  points: number; // Points can be negative
}

// Multiple Response Question
export interface MultipleResponseQuestion extends BaseQuestion {
  type: 'Multiple Response';
  options: MultipleResponseOption[];
  isScored: boolean; // Toggle for scoring
  allowNegative: boolean; // Whether negative scores are allowed
}

// Scale Label Interface
export interface ScaleLabel {
  value: number;
  label: string;
  points: number; // Points at this breakpoint
}

// Scale Question
export interface ScaleQuestion extends BaseQuestion {
  type: 'Scale';
  scaleMin: number; // Minimum scale value
  scaleMax: number; // Maximum scale value
  labels: ScaleLabel[]; // Labels with points
  isScored: boolean; // Toggle for scoring
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

// Number Scoring Range Interface
export interface NumberScoringRange {
  minValue: number;
  maxValue: number;
  points: number; // Points assigned to this range
}

// Number Question
export interface NumberQuestion extends BaseQuestion {
  type: 'Number';
  maxNumber: number;
  isScored: boolean; // Toggle for scoring
  scoringMethod: 'direct' | 'range' | 'None'; // Scoring method
  maxPoints?: number; // For 'direct' method
  scoringRanges?: NumberScoringRange[]; // For 'range' method
}

// Undecided Question (used when the type is not yet chosen)
export interface UndecidedQuestion extends BaseQuestion {
  type: 'Undecided';
}

// Union Type for all Question Types
export type QuestionUnion =
  | NUSNETIDQuestion
  | NUSNETEmailQuestion
  | TeamMemberSelectionQuestion
  | MultipleChoiceQuestion
  | MultipleResponseQuestion
  | ScaleQuestion
  | ShortResponseQuestion
  | LongResponseQuestion
  | DateQuestion
  | NumberQuestion
  | UndecidedQuestion;

export type QuestionData = QuestionUnion;
export type Question = QuestionUnion;