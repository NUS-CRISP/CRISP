/* eslint-disable @typescript-eslint/no-unused-vars */
// import {
//   Alert,
//   Anchor,
//   Button,
//   Container,
//   Paper,
//   PasswordInput,
//   SegmentedControl,
//   Text,
//   TextInput,
//   Title,
// } from '@mantine/core';
// import { useForm } from '@mantine/form';
// import type { Role } from '@shared/types/auth/Role';
// import Roles from '@shared/types/auth/Role';
// import { IconInfoCircle } from '@tabler/icons-react';
// import Link from 'next/link';
// import { useRouter } from 'next/router';
// import { useState } from 'react';

import {
  Accordion,
  Button,
  Container,
  Group,
  Notification,
  ScrollArea,
  Tabs,
} from '@mantine/core';
import { TeamSet } from '@shared/types/TeamSet';
import { useEffect, useState } from 'react';
import ProjectManagementCard from '../cards/ProjectManagementCard';

interface ProjectManagementProps {
  courseId: string;
  teamSets: TeamSet[];
  jiraRegistrationStatus: boolean;
  hasFacultyPermission: boolean;
  onUpdate: () => void;
}

const ProjectManagementInfo: React.FC<ProjectManagementProps> = ({
  courseId,
  teamSets,
  jiraRegistrationStatus,
  hasFacultyPermission,
  onUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<string | null>(
    teamSets ? teamSets[0]?.name : null
  );
  const [error, setError] = useState<string | null>(null);

  const setActiveTabAndSave = (tabName: string) => {
    onUpdate();
    setActiveTab(tabName);
    localStorage.setItem(`activeTeamSetTab_${courseId}`, tabName);
  };

  const handleOAuthButtonClick = () => {
    // Redirect the user to the backend /jira/authorize endpoint
    const apiRoute = `/api/jira/authorize?course=${courseId}`;
    window.location.href = apiRoute; // Update with your backend URL
  };

  useEffect(() => {
    const savedTab = localStorage.getItem(`activeTeamSetTab_${courseId}`);
    if (savedTab && teamSets.some(teamSet => teamSet.name === savedTab)) {
      setActiveTab(savedTab);
    }
  }, [teamSets]);

  const headers = teamSets.map((teamSet, index) => (
    <Tabs.Tab
      key={index}
      value={teamSet.name}
      onClick={() => {
        setActiveTabAndSave(teamSet.name);
      }}
    >
      {teamSet.name}
    </Tabs.Tab>
  ));

  const projectManagementCards = (teamSet: TeamSet) => {
    return (
      <Accordion
        defaultValue={teamSet.teams.length > 0 ? [teamSet.teams[0]._id] : []}
        multiple
        variant="separated"
      >
        {teamSet.teams.map(team => (
          <Accordion.Item key={team._id} value={team._id}>
            <Accordion.Control>{team.teamData.repoName}</Accordion.Control>
            <Accordion.Panel>
              <ProjectManagementCard
                key={team._id}
                number={team.number}
                TA={team.TA}
                teamData={team.teamData}
              />
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    );
  };

  console.log(teamSets);

  return (
    <Container
      style={{
        height: 'calc(100dvh - 2 * 20px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <ScrollArea.Autosize>
        <Tabs value={activeTab} mx={20}>
          <Tabs.List
            style={{ display: 'flex', justifyContent: 'space-evenly' }}
          >
            {headers}
          </Tabs.List>
          {error && (
            <Notification
              title="Error"
              color="red"
              onClose={() => setError(null)}
            >
              {error}
            </Notification>
          )}
          {hasFacultyPermission && (
            <Group style={{ marginBottom: '16px', marginTop: '16px' }}>
              <Button onClick={handleOAuthButtonClick}>
                {jiraRegistrationStatus
                  ? 'Reauthorize with Jira'
                  : 'Authorize with Jira'}
              </Button>
            </Group>
          )}
          {teamSets.map(teamSet => (
            <Tabs.Panel key={teamSet._id} value={teamSet.name}>
              {projectManagementCards(teamSet)}
            </Tabs.Panel>
          ))}
        </Tabs>
      </ScrollArea.Autosize>
    </Container>
  );
};

export default ProjectManagementInfo;
