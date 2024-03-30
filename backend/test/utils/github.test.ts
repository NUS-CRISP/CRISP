import TeamModel from '@models/Team';
import TeamDataModel from '@models/TeamData';
import UserModel from '@models/User';
import * as github from '../../utils/github';

jest.mock('@models/Team');
jest.mock('@models/TeamData');
jest.mock('@models/User');

describe('getGitHubApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a new GitHub App with the correct configuration', () => {
    process.env.GITHUB_APP_ID = '123';
    process.env.GITHUB_APP_PRIVATE_KEY = 'private_key';

    const result = github.getGitHubApp();

    expect(result).toBeDefined();
  });
});

describe('getTeamMembers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null if team data is not found', async () => {
    jest.spyOn(TeamDataModel, 'findOne').mockResolvedValueOnce(null);

    const result = await github.getTeamMembers(123);

    expect(TeamDataModel.findOne).toHaveBeenCalledWith({ teamId: 123 });
    expect(result).toBeNull();
  });

  it('returns null if team is not found', async () => {
    jest.spyOn(TeamDataModel, 'findOne').mockResolvedValueOnce({ _id: 'teamDataId' });
    jest.spyOn(TeamModel, 'findOne').mockResolvedValueOnce(null);

    const result = await github.getTeamMembers(123);

    expect(TeamModel.findOne).toHaveBeenCalledWith({ teamData: 'teamDataId' });
    expect(result).toBeNull();
  });

  it('returns a set of git handles for the team members', async () => {
    const teamDataMock = { _id: 'teamDataId' };
    const teamMock = { members: ['userId1', 'userId2'] };
    const usersMock = [
      { _id: 'userId1', gitHandle: 'user1' },
      { _id: 'userId2', gitHandle: 'user2' },
    ];

    jest.spyOn(TeamDataModel, 'findOne').mockResolvedValueOnce(teamDataMock);
    jest.spyOn(TeamModel, 'findOne').mockResolvedValueOnce(teamMock);
    jest.spyOn(UserModel, 'find').mockResolvedValueOnce(usersMock);

    const result = await github.getTeamMembers(123);

    expect(UserModel.find).toHaveBeenCalledWith({ _id: { $in: ['userId1', 'userId2'] } });
    expect(result).toEqual(new Set(['user1', 'user2']));
  });
});

