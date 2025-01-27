// @shared/types/Answer.ts

export interface BaseAnswer {
    _id?: string;
    question: string; // Reference to the question's _id
    type: string; // Discriminator property
    score?: number; // Optional score for this answer
  }

  // Team Member Selection Answer
  export interface TeamMemberSelectionAnswer extends BaseAnswer {
    type: 'Team Member Selection Answer';
    selectedUserIds: string[];
  }
  // NUSNET ID Answer
  export interface NUSNETIDAnswer extends BaseAnswer {
    type: 'NUSNET ID Answer';
    value: string;
  }
  
  // NUSNET Email Answer
  export interface NUSNETEmailAnswer extends BaseAnswer {
    type: 'NUSNET Email Answer';
    value: string;
  }
  
  
  // Multiple Choice Answer
  export interface MultipleChoiceAnswer extends BaseAnswer {
    type: 'Multiple Choice Answer';
    value: string;
  }
  
  // Multiple Response Answer
  export interface MultipleResponseAnswer extends BaseAnswer {
    type: 'Multiple Response Answer';
    values: string[];
  }
  
  // Scale Answer
  export interface ScaleAnswer extends BaseAnswer {
    type: 'Scale Answer';
    value: number;
  }
  
  // Short Response Answer
  export interface ShortResponseAnswer extends BaseAnswer {
    type: 'Short Response Answer';
    value: string;
  }
  
  // Long Response Answer
  export interface LongResponseAnswer extends BaseAnswer {
    type: 'Long Response Answer';
    value: string;
  }
  
  // Date Answer
  export interface DateAnswer extends BaseAnswer {
    type: 'Date Answer';
    value?: Date; // For single date
    startDate?: Date; // For date range
    endDate?: Date;
  }
  
  // Number Answer
  export interface NumberAnswer extends BaseAnswer {
    type: 'Number Answer';
    value: number;
  }
  
  // Undecided Answer (used when the type is not yet chosen)
  export interface UndecidedAnswer extends BaseAnswer {
    type: 'Undecided Answer';
  }

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
  
  export type Answer = AnswerUnion;
  