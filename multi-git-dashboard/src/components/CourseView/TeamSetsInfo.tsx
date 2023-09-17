import React from 'react';
import { TeamSet } from '@/types/course';
import TeamCard from '@/components/CourseView/TeamCard';
import { Container, Tabs } from '@mantine/core';

interface TeamsInfoProps {
  teamSets: TeamSet[];
}

const TeamsInfo: React.FC<TeamsInfoProps> = ({ teamSets }) => {

  const teamCards = (teamSet : TeamSet) => (
    teamSet.teams.map((team) => (
      <TeamCard key={team._id} number={team.number} members={team.members} />
    ))
  );

  const headers = teamSets.map((teamSet) => (
    <Tabs.Tab key={teamSet._id} value={teamSet.name} />
  ));

  const panels = teamSets.map((teamSet) => (
    <Tabs.Panel key={teamSet._id} value={teamSet.name}>
      {teamCards(teamSet)}
    </Tabs.Panel>
  ));

  return (
    <Container size="md" style={{ minHeight: '100vh' }}>
      <Tabs>
        <Tabs.List style={{ display: 'flex', justifyContent: 'space-evenly' }}>
          {headers}
        </Tabs.List>
        {panels}
      </Tabs>
    </Container>
  
  );
};

export default TeamsInfo;