// @shared/types/Answer.ts

export interface BaseAnswer {
    _id?: string;
    question: string; // Reference to the question's _id
    type: string; // Discriminator property
  }
  
  // Multiple Choice Answer
  export interface MultipleChoiceAnswer extends BaseAnswer {
    type: 'Multiple Choice';
    value: string;
  }
  
  // Multiple Response Answer
  export interface MultipleResponseAnswer extends BaseAnswer {
    type: 'Multiple Response';
    values: string[];
  }
  
  // Scale Answer
  export interface ScaleAnswer extends BaseAnswer {
    type: 'Scale';
    value: number;
  }
  
  // Short Response Answer
  export interface ShortResponseAnswer extends BaseAnswer {
    type: 'Short Response';
    value: string;
  }
  
  // Long Response Answer
  export interface LongResponseAnswer extends BaseAnswer {
    type: 'Long Response';
    value: string;
  }
  
  // Date Answer
  export interface DateAnswer extends BaseAnswer {
    type: 'Date';
    value?: Date; // For single date
    startDate?: Date; // For date range
    endDate?: Date;
  }
  
  // Number Answer
  export interface NumberAnswer extends BaseAnswer {
    type: 'Number';
    value: number;
  }
  
  // Undecided Answer (used when the type is not yet chosen)
  export interface UndecidedAnswer extends BaseAnswer {
    type: 'Undecided';
  }
  
  export type AnswerUnion =
    | MultipleChoiceAnswer
    | MultipleResponseAnswer
    | ScaleAnswer
    | ShortResponseAnswer
    | LongResponseAnswer
    | DateAnswer
    | NumberAnswer
    | UndecidedAnswer;
  
  export type Answer = AnswerUnion;
  