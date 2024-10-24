// shared/types/AssessmentResult.ts

import { InternalAssessment } from "./InternalAssessment";
import { Submission } from "./Submission";
import { User } from "./User";

export interface MarkEntry {
    marker: User;
    submission: Submission;
    score: number;
}

export interface AssessmentResult {
    team: any;
    _id: string;
    assessment: InternalAssessment;
    student: User;
    marks: MarkEntry[];
    averageScore: number;
    createdAt: Date;
    updatedAt: Date;
}
  