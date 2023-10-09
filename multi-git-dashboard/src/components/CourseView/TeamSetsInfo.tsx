import React, { useState } from 'react';
import { Course, TeamSet } from '@/types/course';
import TeamCard from '../CourseView/Cards/TeamCard';
import { Container, Tabs, Button } from '@mantine/core';
import TeamSetForm from '../forms/TeamSetForm';
import TeamForm from '../forms/TeamForm';

interface TeamsInfoProps {
  course : Course;
  onUpdate: () => void;
}

const TeamsInfo: React.FC<TeamsInfoProps> = ({ course, onUpdate }) => {
  const [isCreatingTeamSet, setIsCreatingTeamSet] = useState<boolean>(false);
  const [isCreatingTeam, setIsCreatingTeam] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const teamCards = (teamSet : TeamSet) => (
    teamSet.teams.map((team) => (
      <TeamCard key={team._id} number={team.number} TA={team.TA} members={team.members} />
    ))
  );

  const headers = course.teamSets.map((teamSet) => (
    <Tabs.Tab key={teamSet._id} value={teamSet.name} onClick={ e => setActiveTab(teamSet.name)}>
      {teamSet.name}
    </Tabs.Tab>
  ));

  const panels = course.teamSets.map((teamSet) => (
    <Tabs.Panel key={teamSet._id} value={teamSet.name}>
      {teamCards(teamSet)}
    </Tabs.Panel>
  ));

  const handleTeamSetCreated = () => {
    setIsCreatingTeamSet(false);
    onUpdate();
  };

  const handleTeamCreated = () => {
    setIsCreatingTeam(false);
    onUpdate();
    console.error(course.teamSets[0])
  };

  return (
    <Container>
      <Tabs value={activeTab}>
        <Tabs.List style={{ display: 'flex', justifyContent: 'space-evenly' }}>
          {headers}
        </Tabs.List>
        {panels}
      </Tabs>
      <Button onClick={() => setIsCreatingTeamSet(!isCreatingTeamSet)} style={{ marginBottom: '16px' }}>
        {isCreatingTeamSet ? 'Cancel' : 'Create TeamSet'}
      </Button>
      {activeTab &&
        <Button onClick={() => setIsCreatingTeam(!isCreatingTeam)} style={{ marginBottom: '16px'}}>
          {isCreatingTeam ? 'Cancel' : 'Create Teams'}
        </Button>
      }
      {isCreatingTeamSet &&
        <TeamSetForm
          courseId={course._id}
          onTeamSetCreated={handleTeamSetCreated}
        />
      }
      {isCreatingTeam && activeTab &&
        <TeamForm
          courseId={course._id}
          teamSet={activeTab}
          onTeamCreated={handleTeamCreated}
        />
      }
    </Container>
  );
};

export default TeamsInfo;