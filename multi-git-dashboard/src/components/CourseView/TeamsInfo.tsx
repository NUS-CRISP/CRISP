import React from 'react';
import TeamCard from './TeamCard';
import { User } from '../../types/user';

interface Team {
  _id: string;
  teamNumber: number;
  members: User[];
}

interface TeamSet {
  _id: string;
  name: string;
  teams: Team[];
}

interface TeamsInfoProps {
  teamSets: TeamSet[];
}

const TeamsInfo: React.FC<TeamsInfoProps> = ({ teamSets }) => {
  const teamsRows = teamSets.map((teamSet) => (
    <TeamCard
      key={teamSet.teams[0]?._id}
      teamNumber={teamSet.teams[0]?.teamNumber}
      members={teamSet.teams[0]?.members}
    />
  ));

  return <div>{teamsRows}</div>;
};

export default TeamsInfo;