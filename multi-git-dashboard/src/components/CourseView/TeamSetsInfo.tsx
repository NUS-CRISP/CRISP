import React, { useState } from 'react';
import { Course, TeamSet } from '@/types/course';
import TeamCard from '@/components/CourseView/TeamCard';
import { Container, Tabs, Button } from '@mantine/core';
import TeamSetForm from '../forms/TeamSetForm';

interface TeamsInfoProps {
  course : Course
}

const TeamsInfo: React.FC<TeamsInfoProps> = ({ course }) => {
  const [isCreatingTeamSet, setIsCreatingTeamSet] = useState(false);

  const teamCards = (teamSet : TeamSet) => (
    teamSet.teams.map((team) => (
      <TeamCard key={team._id} number={team.number} members={team.members} />
    ))
  );

  const headers = course.teamSets.map((teamSet) => (
    <Tabs.Tab key={teamSet._id} value={teamSet.name}>{teamSet.name}</Tabs.Tab>
  ));

  const panels = course.teamSets.map((teamSet) => (
    <Tabs.Panel key={teamSet._id} value={teamSet.name}>
      {teamCards(teamSet)}
    </Tabs.Panel>
  ));

  const handleCreateTeamSet = () => {
    setIsCreatingTeamSet(true);
  };

  const handleTeamSetCreated = () => {
    setIsCreatingTeamSet(false);
  };

  return (
    <Container>
      <Tabs>
        <Tabs.List style={{ display: 'flex', justifyContent: 'space-evenly' }}>
          {headers}
        </Tabs.List>
        {panels}
      </Tabs>
      <Button onClick={handleCreateTeamSet} style={{ marginBottom: '16px' }}>
        Create TeamSet
      </Button>

      {isCreatingTeamSet ? (
        <TeamSetForm
          courseId={course._id}
          onTeamSetCreated={handleTeamSetCreated}
        />
      ) : <h1>{course.teamSets.length}</h1>}
    </Container>
  );
};

export default TeamsInfo;