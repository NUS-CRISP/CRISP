import { AnswerUnion } from './Answer';
import { User } from './User';

export interface Submission {
  _id: string;
  assessment: string;
  user: User;
  answers: AnswerUnion[];
  submittedAt: string;
  isDraft: boolean;
  score: number;
  adjustedScore?: number;
  createdAt?: string;
  updatedAt?: string;
}
