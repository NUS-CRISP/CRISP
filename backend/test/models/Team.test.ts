import mongoose from 'mongoose';
import { describe, expect, it} from 'vitest'
import TeamModel, { Team } from '../../models/Team';

describe('Team Model and Schema', () => {
  it('should create a valid team document', async () => {
    const validTeamData = {
      teamNumber: 1,
      assistants: null,
      students: [],
    };

    const teamDoc = new TeamModel(validTeamData);
    expect(teamDoc.teamNumber).toBe(1);
  });

  it('should require teamNumber field', async () => {
    const invalidTeamData: Partial<Team> = {
    };

    try {
      await new TeamModel(invalidTeamData).validate();
    } catch (error) {
      expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
      const validationError = error as mongoose.Error.ValidationError;
      expect(validationError.errors.teamNumber).toBeDefined();
    }
  });
});