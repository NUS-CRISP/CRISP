import { Carousel, Embla } from '@mantine/carousel';
import { BarChart } from '@mantine/charts';
import { Card, Group, SimpleGrid, Stack, Table, Text } from '@mantine/core';
import { JiraBoard, JiraIssue, JiraSprint } from '@shared/types/JiraData';
import { User } from '@shared/types/User';
import { useState } from 'react';

interface ProjectManagementCardProps {
  TA: User | null;
  jiraBoard: JiraBoard | null;
}

const ProjectManagementCard: React.FC<ProjectManagementCardProps> = ({
  TA,
  jiraBoard,
}) => {
  const [embla, setEmbla] = useState<Embla | null>(null);

  const getActiveSprintBoard = (
    jiraSprint: JiraSprint | undefined,
    columns: {
      name: string;
    }[]
  ) => {
    return (
      jiraSprint &&
      columns && (
        <Card withBorder>
          <SimpleGrid cols={{ base: 1, xs: columns.length }} mt="md" mb="xs">
            {columns.map((column, index) => (
              <Stack key={index}>
                <Text fw={600} size="sm">
                  {column.name}
                </Text>
                {getJiraBoardColumn(jiraSprint, column.name)}
              </Stack>
            ))}
          </SimpleGrid>
        </Card>
      )
    );
  };

  const getJiraBoardColumn = (jiraSprint: JiraSprint, status: string) => {
    return (
      jiraSprint.jiraIssues &&
      jiraSprint.jiraIssues.map(
        issue => issue.fields.status?.name === status && getJiraBoardCard(issue)
      )
    );
  };

  const getJiraBoardCard = (issue: JiraIssue) => (
    <Card radius="md" shadow="sm" padding="lg" withBorder>
      <Group style={{ alignItems: 'center' }}>
        <Text fw={600} size="sm">
          {issue.fields.summary || '-'}
        </Text>
      </Group>
      <Group style={{ alignItems: 'center' }}>
        <Text size="sm">Issue Type:</Text>
        <Text size="sm">{issue.fields.issuetype?.name || '-'}</Text>
      </Group>
      <Group style={{ alignItems: 'center' }}>
        <Text size="sm">Story Points:</Text>
        <Text size="sm">{issue.storyPoints || '-'}</Text>
      </Group>
      <Group style={{ alignItems: 'center' }}>
        <Text size="sm">Assignee:</Text>
        <Text size="sm">{issue.fields.assignee?.displayName || '-'}</Text>
      </Group>
    </Card>
  );

  const getStatsTable = (jiraSprints: JiraSprint[]) => {
    interface AssigneeStats {
      assignee: string;
      issues: number;
      storyPoints: number;
      storyPointsPerIssue: number;
    }

    const assigneeStatsArrays: Record<string, AssigneeStats[]> = {};

    jiraSprints.forEach(jiraSprint => {
      const assigneeStatsMap: Record<string, AssigneeStats> = {};
      let totalIssues = 0;
      let totalStoryPoints = 0;

      jiraSprint.jiraIssues.forEach(issue => {
        const assigneeName = issue.fields.assignee?.displayName ?? 'Unassigned';
        if (!assigneeStatsMap[assigneeName]) {
          assigneeStatsMap[assigneeName] = {
            assignee: assigneeName,
            issues: 0,
            storyPoints: 0,
            storyPointsPerIssue: 0,
          };
        }
        assigneeStatsMap[assigneeName].issues++;
        assigneeStatsMap[assigneeName].storyPoints += issue.storyPoints ?? 0;

        // Accumulate total issues and story points
        totalIssues++;
        totalStoryPoints += issue.storyPoints ?? 0;
      });

      assigneeStatsMap['Total'] = {
        assignee: 'Total',
        issues: totalIssues,
        storyPoints: totalStoryPoints,
        storyPointsPerIssue: 0,
      };

      const assigneeStatsArray: AssigneeStats[] =
        Object.values(assigneeStatsMap);

      // Calculate average story points per issue for each assignee
      assigneeStatsArray.forEach(assigneeStats => {
        assigneeStats.storyPointsPerIssue =
          assigneeStats.issues > 0
            ? assigneeStats.storyPoints / assigneeStats.issues
            : 0;
      });

      const endDate = new Date(jiraSprint.endDate);
      assigneeStatsArrays[endDate.toISOString()] = assigneeStatsArray;
    });

    // Get the keys as an array and sort them
    const sortedKeys = Object.keys(assigneeStatsArrays)
      .map(key => new Date(key))
      .sort((a, b) => b.getTime() - a.getTime())
      .map(key => key.toISOString());

    const sortedAssigneeStatsArrays: AssigneeStats[][] = sortedKeys.map(
      key => assigneeStatsArrays[key]
    );

    const rows = (assigneeStatsArray: AssigneeStats[]) =>
      assigneeStatsArray.map(assigneeStats => (
        <Table.Tr key={assigneeStats.assignee}>
          <Table.Td>{assigneeStats.assignee}</Table.Td>
          <Table.Td>{assigneeStats.issues}</Table.Td>
          <Table.Td>{assigneeStats.storyPoints}</Table.Td>
          <Table.Td>{assigneeStats.storyPointsPerIssue.toFixed(2)}</Table.Td>
        </Table.Tr>
      ));

    return (
      <Card withBorder>
        <Carousel
          controlsOffset="xs"
          slideSize="100%"
          loop
          getEmblaApi={setEmbla}
          nextControlProps={{
            // fix for only first carousel working
            onClick: () => embla?.reInit(),
          }}
          previousControlProps={{
            onClick: () => embla?.reInit(),
          }}
        >
          {sortedAssigneeStatsArrays.map((assigneeStatsArray, index) => (
            <Carousel.Slide key={index}>
              <Text
                size="sm"
                fw={500}
                style={{ textAlign: 'center', marginBottom: 8 }}
              >
                Sprint ending {new Date(sortedKeys[index]).toLocaleDateString()}
              </Text>
              <Group style={{ paddingLeft: '6%', paddingRight: '6%' }}>
                <Table
                  striped
                  highlightOnHover
                  withTableBorder
                  withColumnBorders
                >
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Assignee</Table.Th>
                      <Table.Th>Issues</Table.Th>
                      <Table.Th>Story Points</Table.Th>
                      <Table.Th>Story Points Per Issue</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>{rows(assigneeStatsArray)}</Table.Tbody>
                </Table>
              </Group>
            </Carousel.Slide>
          ))}
        </Carousel>
      </Card>
    );
  };

  const getVelocityChart = (jiraSprints: JiraSprint[]) => {
    interface SprintSummary {
      endDate: Date;
      endDateString: string;
      Commitment: number;
      Completed: number;
    }

    const sprintData: SprintSummary[] = [];

    jiraSprints.forEach(sprint => {
      const sprintSummary: SprintSummary = {
        endDate: new Date(sprint.endDate),
        endDateString: new Date(sprint.endDate).toLocaleDateString(),
        Commitment: 0,
        Completed: 0,
      };

      sprint.jiraIssues.forEach(issue => {
        sprintSummary['Commitment'] += issue.storyPoints ?? 0;

        if (
          issue.fields.resolution &&
          issue.fields.resolution.name === 'Done'
        ) {
          sprintSummary['Completed'] += issue.storyPoints ?? 0;
        }
      });

      sprintData.push(sprintSummary);
    });

    sprintData.sort((a, b) => a.endDate.getTime() - b.endDate.getTime());

    // Calculate the total completed story points
    const totalCompletedStoryPoints = sprintData.reduce(
      (acc, sprintSummary) => acc + sprintSummary['Completed'],
      0
    );

    // Calculate the velocity (average completed story points)
    const velocity =
      sprintData.length > 0 ? totalCompletedStoryPoints / sprintData.length : 0;

    return (
      <Card withBorder>
        <Text
          size="sm"
          fw={500}
          style={{ textAlign: 'center', marginBottom: 8 }}
        >
          Velocity Chart
        </Text>
        <BarChart
          h={400}
          data={sprintData}
          dataKey="endDateString"
          xAxisLabel="Sprint"
          yAxisLabel="Story Points"
          withLegend
          legendProps={{ verticalAlign: 'top' }}
          series={[
            { name: 'Commitment', color: 'gray.5' },
            { name: 'Completed', color: 'teal.7' },
          ]}
        />
        <Group style={{ alignItems: 'center' }}>
          <Text size="sm">Team's Velocity:</Text>
          <Text size="sm">{velocity.toFixed(2)}</Text>
        </Group>
      </Card>
    );
  };

  return (
    <Stack>
      <Group style={{ alignItems: 'center' }}>
        <Text>Teaching Assistant:</Text>
        <Text>{TA ? TA.name : 'None'}</Text>
      </Group>
      <Group style={{ alignItems: 'center' }}>
        <Text>Jira Project:</Text>
        <Text>{jiraBoard ? jiraBoard.jiraLocation.projectName : 'None'}</Text>
      </Group>
      {jiraBoard && (
        <>
          <Group>
            <Text>Current Sprint:</Text>
            {jiraBoard.jiraSprints.map(
              sprint => sprint.state === 'active' && <Text>{sprint.name}</Text>
            )}
          </Group>
          <Group>
            <Text>Start Date:</Text>
            {jiraBoard.jiraSprints.map(sprint => {
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
            {jiraBoard.jiraSprints.map(sprint => {
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
          {jiraBoard.jiraSprints &&
            getActiveSprintBoard(
              jiraBoard.jiraSprints.find(sprint => sprint.state === 'active'),
              jiraBoard.columns
            )}
          {jiraBoard.jiraSprints && getStatsTable(jiraBoard.jiraSprints)}
          {jiraBoard.jiraSprints && getVelocityChart(jiraBoard.jiraSprints)}
        </>
      )}
    </Stack>
  );
};

export default ProjectManagementCard;
