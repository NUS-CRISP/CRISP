// shared/types/AssessmentAssignmentSet.ts

import { InternalAssessment } from "./InternalAssessment";
import { Team } from "./Team";
import { TeamSet } from "./TeamSet";
import { User } from "./User";

export interface AssignedTeam {
  team: Team;
  tas: User[];
}

export interface AssignedUser {
  user: User;
  tas: User[];
}
  
export interface AssessmentAssignmentSet {
  _id: string;
  assessment: InternalAssessment;
  originalTeams: TeamSet[];
  assignedTeams: AssignedTeam[];
  assignedUsers?: AssignedUser[]; // Array of ObjectIds of Users (optional, only for individual granularity)
  createdAt: Date;
  updatedAt: Date;
}
