// @shared/types/AnswerInput.ts

export type AnswerInput =
  | string
  | string[]
  | number
  | Date
  | [Date | null, Date | null]
  | null
  | undefined;
