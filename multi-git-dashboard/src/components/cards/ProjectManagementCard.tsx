import { BarChart } from '@mantine/charts';
import { Card, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { JiraBoard, JiraIssue, JiraSprint } from '@shared/types/JiraData';
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
  const getActiveSprintBoard = (jiraSprint: JiraSprint | undefined) => {
    return (
      jiraSprint && (
        <Card withBorder>
          <SimpleGrid cols={{ base: 1, xs: 3 }} mt="md" mb="xs">
            <Stack>
              <Text fw={600}>To Do</Text>
              {getJiraBoardColumn(jiraSprint, 'To Do')}
            </Stack>
            <Stack>
              <Text fw={600}>In Progress</Text>
              {getJiraBoardColumn(jiraSprint, 'In Progress')}
            </Stack>
            <Stack>
              <Text fw={600}>Done</Text>
              {getJiraBoardColumn(jiraSprint, 'Done')}
            </Stack>
          </SimpleGrid>
        </Card>
      )
    );
  };

  const getJiraBoardColumn = (jiraSprint: JiraSprint, status: string) =>
    jiraSprint?.jiraIssues?.map(
      issue => issue.fields.status.name === status && getJiraBoardCard(issue)
    );

  const getJiraBoardCard = (issue: JiraIssue) => (
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

  const getChart = (board: JiraBoard) => {
    interface AssigneeStats {
      Assignee: string;
      Issues: number;
      'Story Points': number;
    }

    const assigneeStatsArrays: Record<string, AssigneeStats[]> = {};

    board.jiraSprints.forEach(jiraSprint => {
      const assigneeStatsMap: Record<string, AssigneeStats> = {};

      jiraSprint.jiraIssues.forEach(issue => {
        const assigneeName = issue.fields.assignee?.displayName ?? 'Unassigned';
        if (!assigneeStatsMap[assigneeName]) {
          assigneeStatsMap[assigneeName] = {
            Assignee: assigneeName,
            Issues: 0,
            'Story Points': 0,
          };
        }
        assigneeStatsMap[assigneeName].Issues++;
        assigneeStatsMap[assigneeName]['Story Points'] +=
          issue.storyPoints ?? 0;
      });

      const assigneeStatsArray: AssigneeStats[] =
        Object.values(assigneeStatsMap);
      assigneeStatsArrays[new Date(jiraSprint.endDate).toLocaleDateString()] =
        assigneeStatsArray;
    });

    // Get the keys as an array and sort them
    const sortedKeys = Object.keys(assigneeStatsArrays).sort();
    const sortedAssigneeStatsArrays: AssigneeStats[][] = sortedKeys.map(
      key => assigneeStatsArrays[key]
    );

    return (
      <>
        {sortedAssigneeStatsArrays.map((assigneeStatsArray, index) => (
          <Card key={index} withBorder>
            <Text
              size="sm"
              fw={500}
              style={{ textAlign: 'center', marginBottom: 8 }}
            >
              Sprint ending {sortedKeys[index]}
            </Text>
            <BarChart
              h={400}
              data={assigneeStatsArray}
              dataKey="Assignee"
              withLegend
              legendProps={{ verticalAlign: 'bottom', height: 50 }}
              series={[
                { name: 'Issues', color: 'blue.6' },
                { name: 'Story Points', color: 'teal.6' },
              ]}
            />
          </Card>
        ))}
      </>
    );
  };

  return (
    <Stack>
      <Group style={{ alignItems: 'center' }}>
        <Text>Team {number.toString()}</Text>
      </Group>
      <Group style={{ alignItems: 'center' }}>
        <Text>Teaching Assistant:</Text>
        <Text>{TA ? TA.name : 'None'}</Text>
      </Group>
      {teamData?.board && (
        <>
          <Group>
            <Text>Current Sprint:</Text>
            {teamData.board?.jiraSprints.map(
              sprint => sprint.state === 'active' && <Text>{sprint.name}</Text>
            )}
          </Group>
          <Group>
            <Text>Start Date:</Text>
            {teamData.board?.jiraSprints.map(sprint => {
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
            {teamData.board?.jiraSprints.map(sprint => {
              const endDate = new Date(sprint.endDate);
              return (
                sprint.state === 'active' && (
                  <Text>
                    {endDate.toLocaleTimeString()},{' '}
                    {endDate.toLocaleDateString()}
                  </Text>
                )
              );
            })}
          </Group>
          {getActiveSprintBoard(
            teamData.board.jiraSprints.find(sprint => sprint.state === 'active')
          )}
          {getChart(teamData.board)}
        </>
      )}
    </Stack>
  );
};

export default ProjectManagementCard;
