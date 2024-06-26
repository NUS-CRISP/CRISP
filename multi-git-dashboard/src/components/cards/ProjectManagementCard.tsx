import { Carousel, Embla } from '@mantine/carousel';
import { BarChart } from '@mantine/charts';
import { Card, Group, SimpleGrid, Stack, Text } from '@mantine/core';
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

  const getAssigneeStatsBarChart = (jiraSprints: JiraSprint[]) => {
    interface AssigneeStats {
      Assignee: string;
      Issues: number;
      'Story Points': number;
    }

    const assigneeStatsArrays: Record<string, AssigneeStats[]> = {};

    jiraSprints.forEach(jiraSprint => {
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

    return (
      <Card withBorder>
        <Carousel
          withIndicators
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
            </Carousel.Slide>
          ))}
        </Carousel>
      </Card>
    );
  };

  const getSprintCompletionBarChart = (jiraSprints: JiraSprint[]) => {
    interface SprintSummary {
      endDate: Date;
      endDateString: string;
      Issues: number;
      'Story Points': number;
      'Issues Completed': number;
      'Story Points Completed': number;
    }

    const sprintData: SprintSummary[] = [];

    jiraSprints.forEach(sprint => {
      const sprintSummary: SprintSummary = {
        endDate: new Date(sprint.endDate),
        endDateString: new Date(sprint.endDate).toLocaleDateString(),
        Issues: 0,
        'Story Points': 0,
        'Issues Completed': 0,
        'Story Points Completed': 0,
      };

      sprint.jiraIssues.forEach(issue => {
        sprintSummary.Issues++;
        sprintSummary['Story Points'] += issue.storyPoints ?? 0;

        if (
          issue.fields.resolution &&
          issue.fields.resolution.name === 'Done'
        ) {
          sprintSummary['Issues Completed']++;
          sprintSummary['Story Points Completed'] += issue.storyPoints ?? 0;
        }
      });

      sprintData.push(sprintSummary);
    });

    sprintData.sort((a, b) => a.endDate.getTime() - b.endDate.getTime());

    return (
      <Card withBorder>
        <Text
          size="sm"
          fw={500}
          style={{ textAlign: 'center', marginBottom: 8 }}
        >
          Sprint Completion Status
        </Text>
        <BarChart
          h={400}
          data={sprintData}
          dataKey="endDateString"
          withLegend
          legendProps={{ verticalAlign: 'bottom', height: 50 }}
          series={[
            { name: 'Issues Completed', color: 'blue.6' },
            { name: 'Issues', color: 'blue.8' },
            { name: 'Story Points Completed', color: 'teal.6' },
            { name: 'Story Points', color: 'teal.8' },
          ]}
        />
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
          {jiraBoard.jiraSprints &&
            getAssigneeStatsBarChart(jiraBoard.jiraSprints)}
          {jiraBoard.jiraSprints &&
            getSprintCompletionBarChart(jiraBoard.jiraSprints)}
        </>
      )}
    </Stack>
  );
};

export default ProjectManagementCard;
