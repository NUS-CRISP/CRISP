// models/AssessmentAssignmentSet.ts

import mongoose, { Schema, Types, Document } from 'mongoose';
import { Team } from './Team';
import { User } from './User';
import { InternalAssessment } from './InternalAssessment'; // Adjust the import path as necessary

/**
 * Interface for Assigned Teams within the AssessmentAssignmentSet.
 */
export interface AssignedTeam {
  team: Types.ObjectId | Team;
  tas: Types.ObjectId[] | User[];
}

/**
 * Interface for the AssessmentAssignmentSet document.
 */
export interface AssessmentAssignmentSet extends Document {
  assessment: Types.ObjectId | InternalAssessment;
  originalTeams: Types.ObjectId[] | Team[];
  assignedTeams: AssignedTeam[];
}

/**
 * Schema for AssignedTeam subdocuments.
 */
const assignedTeamSchema = new Schema<AssignedTeam>(
  {
    team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    tas: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { _id: false }
);

/**
 * Schema for AssessmentAssignmentSet.
 */
const assessmentAssignmentSetSchema = new Schema<AssessmentAssignmentSet>(
  {
    assessment: { type: Schema.Types.ObjectId, ref: 'InternalAssessment', required: true, unique: true },
    originalTeams: [{ type: Schema.Types.ObjectId, ref: 'Team', required: true }],
    assignedTeams: [assignedTeamSchema],
  },
  { timestamps: true }
);

/**
 * Model for AssessmentAssignmentSet.
 */
const AssessmentAssignmentSetModel = mongoose.model<AssessmentAssignmentSet>(
  'AssessmentAssignmentSet',
  assessmentAssignmentSetSchema
);

export default AssessmentAssignmentSetModel;
