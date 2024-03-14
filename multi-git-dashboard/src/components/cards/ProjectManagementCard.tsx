import { Card, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { JiraIssue, JiraSprint } from '@shared/types/JiraData';
import { TeamData } from '@shared/types/TeamData';
import { User } from '@shared/types/User';

interface ProjectManagementCardProps {
  number: number;
  TA: User | null;
  teamData: TeamData | null;
}

const ProjectManagementCard: React.FC<ProjectManagementCardProps> = ({
  number,
  TA,
  teamData,
}) => {
  const getColumnCard = (
    jiraSprints: JiraSprint[] | undefined,
    status: string
  ) =>
    jiraSprints?.map(
      sprint =>
        sprint.state === 'active' &&
        sprint?.jiraIssues?.map(
          issue => issue.fields.status.name === status && getIssueCard(issue)
        )
    );

  const getIssueCard = (issue: JiraIssue) => (
    <Card radius="md" shadow="sm" padding="lg" withBorder>
      <Group style={{ alignItems: 'center' }}>
        <Text fw={500}>{issue.fields.summary}</Text>
      </Group>
      <Group style={{ alignItems: 'center' }}>
        <Text>Issue Type:</Text>
        <Text>{issue.fields.issuetype.name}</Text>
      </Group>
      <Group style={{ alignItems: 'center' }}>
        <Text>Story Points:</Text>
        <Text>{issue.storyPoints || '-'}</Text>
      </Group>
      <Group style={{ alignItems: 'center' }}>
        <Text>Assignee:</Text>
        <Text>{issue.fields?.assignee?.displayName || '-'}</Text>
      </Group>
    </Card>
  );

  return (
    <Card shadow="sm" padding="lg" radius="md" my={6} withBorder>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start',
        }}
      >
        <Group mt="md" mb="xs">
          <Text>Team {number.toString()}</Text>
        </Group>
      </div>
      <Group style={{ alignItems: 'center' }}>
        <Text>Teaching Assistant:</Text>
        <Text>{TA ? TA.name : 'None'}</Text>
      </Group>
      <Group style={{ alignItems: 'center' }}>
        <Text>Repository:</Text>
        <Text>{teamData ? teamData.repoName : 'None'}</Text>
      </Group>
      <Group>
        <Text>Current Sprint:</Text>
        {teamData?.board?.jiraSprints.map(
          sprint => sprint.state === 'active' && <Text>{sprint.name}</Text>
        )}
      </Group>
      <Group>
        <Text>Start Date:</Text>
        {teamData?.board?.jiraSprints.map(sprint => {
          const startDate = new Date(sprint.startDate);
          return (
            sprint.state === 'active' && (
              <Text>
                {startDate.toLocaleTimeString()},{' '}
                {startDate.toLocaleDateString()}
              </Text>
            )
          );
        })}
      </Group>
      <Group>
        <Text>End Date:</Text>
        {teamData?.board?.jiraSprints.map(sprint => {
          const endDate = new Date(sprint.endDate);
          return (
            sprint.state === 'active' && (
              <Text>
                {endDate.toLocaleTimeString()}, {endDate.toLocaleDateString()}
              </Text>
            )
          );
        })}
      </Group>
      <SimpleGrid cols={{ base: 1, xs: 3 }} mt="md" mb="xs">
        <Stack>
          <Text fw={600}>To Do</Text>
          {getColumnCard(teamData?.board?.jiraSprints, 'To Do')}
        </Stack>
        <Stack>
          <Text fw={600}>In Progress</Text>
          {getColumnCard(teamData?.board?.jiraSprints, 'In Progress')}
        </Stack>
        <Stack>
          <Text fw={600}>Done</Text>
          {getColumnCard(teamData?.board?.jiraSprints, 'Done')}
        </Stack>
      </SimpleGrid>
    </Card>
  );
};

export default ProjectManagementCard;
