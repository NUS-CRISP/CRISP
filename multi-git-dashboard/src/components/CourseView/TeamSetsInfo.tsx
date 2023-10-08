import React, { useState } from 'react';
import { Course, TeamSet } from '@/types/course';
import { Container, Tabs, Button } from '@mantine/core';
import TeamSetForm from '../forms/TeamSetForm';
import TeamCard from './Cards/TeamCard';

interface TeamsInfoProps {
  course: Course;
  onUpdate: () => void;
}

const TeamsInfo: React.FC<TeamsInfoProps> = ({ course, onUpdate }) => {
  const [isCreatingTeamSet, setIsCreatingTeamSet] = useState(false);

  const teamCards = (teamSet: TeamSet) =>
    teamSet.teams.map(team => (
      <TeamCard key={team._id} number={team.number} members={team.members} />
    ));

  const headers = course.teamSets.map(teamSet => (
    <Tabs.Tab key={teamSet._id} value={teamSet.name}>
      {teamSet.name}
    </Tabs.Tab>
  ));

  const panels = course.teamSets.map(teamSet => (
    <Tabs.Panel key={teamSet._id} value={teamSet.name}>
      {teamCards(teamSet)}
    </Tabs.Panel>
  ));

  const handleTeamSetCreated = () => {
    setIsCreatingTeamSet(false);
    onUpdate();
  };

  return (
    <Container>
      <Tabs>
        <Tabs.List style={{ display: 'flex', justifyContent: 'space-evenly' }}>
          {headers}
        </Tabs.List>
        {panels}
      </Tabs>
      <Button
        onClick={() => setIsCreatingTeamSet(!isCreatingTeamSet)}
        style={{ marginBottom: '16px' }}
      >
        {isCreatingTeamSet ? 'Cancel' : 'Create TeamSet'}
      </Button>

      {isCreatingTeamSet && (
        <TeamSetForm
          courseId={course._id}
          onTeamSetCreated={handleTeamSetCreated}
        />
      )}
    </Container>
  );
};

export default TeamsInfo;
