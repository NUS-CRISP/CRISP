import React from 'react';
import TeamCard from './TeamCard';
import { User } from '../../types/user';

interface Team {
  _id: string;
  teamNumber: number;
  assistant: User;
  students: User[];
}

interface TeamsInfoProps {
  teams: Team[];
}

const TeamsInfo: React.FC<TeamsInfoProps> = ({ teams }) => {
  const teamsRows = teams.map((team) => (
    <TeamCard
      key={team._id}
      teamNumber={team.teamNumber}
      assistant={team.assistant}
      students={team.students}
    />
  ));

  return <div>{teamsRows}</div>;
};

export default TeamsInfo;