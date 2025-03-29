import { Carousel, Embla } from '@mantine/carousel';
import { BarChart } from '@mantine/charts';
import {
  Card,
  Group,
  MultiSelect,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { JiraBoard, JiraIssue, JiraSprint } from '@shared/types/JiraData';
import { User } from '@shared/types/User';
import { useState } from 'react';
import TutorialPopover from '../tutorial/TutorialPopover';
import { useTutorialContext } from '../tutorial/TutorialContext';

interface ProjectManagementJiraCardProps {
  TA: User | null;
  jiraBoard: JiraBoard | null;
  renderTutorialPopover?: boolean;
}

interface SprintSummary {
  startDate: Date;
  startDateString: string;
  'Story Points Commitment': number;
  'Issues Commitment': number;
  'Story Points Completed': number;
  'Issues Completed': number;
}

interface AssigneeStats {
  assignee: string;
  issues: number;
  storyPoints: number;
  storyPointsPerIssue: number;
}

enum VelocityChartType {
  StoryPoints = 'storyPoints',
  Issues = 'issues',
}

const ProjectManagementJiraCard: React.FC<ProjectManagementJiraCardProps> = ({
  TA,
  jiraBoard,
  renderTutorialPopover = false,
}) => {
  const { curTutorialStage } = useTutorialContext();
  const [embla, setEmbla] = useState<Embla | null>(null);

  const [selectedVelocityChart, setSelectedVelocityChart] =
    useState<VelocityChartType>(VelocityChartType.StoryPoints); // Default to 'story points'

  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  // const [storyPointsEstimate, setStoryPointsEstimate] = useState<number>(4);

  // const handleStoryPointsEstimateChange = (value: string | number) => {
  //   const newValue = typeof value === 'string' ? parseInt(value, 10) : value;
  //   if (!isNaN(newValue) && newValue >= 0) {
  //     setStoryPointsEstimate(newValue);
  //   }
  // };

  const getActiveSprintBoard = (
    jiraSprint: JiraSprint | undefined,
    columns: {
      name: string;
    }[]
  ) => {
    return (
      jiraSprint &&
      columns && (
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
      )
    );
  };

  const getJiraBoardColumn = (jiraSprint: JiraSprint, status: string) => {
    return (
      jiraSprint.jiraIssues &&
      jiraSprint.jiraIssues
        .filter(issue => {
          // Filter by status and selected assignees
          const issueAssignee =
            issue.fields.assignee?.displayName ?? 'Unassigned';
          return (
            issue.fields.status?.name.toLowerCase() === status.toLowerCase() &&
            (selectedAssignees.length === 0 ||
              (issueAssignee && selectedAssignees.includes(issueAssignee)))
          );
        })
        .map(issue => getJiraBoardCard(issue))
    );
  };

  const getJiraBoardCard = (issue: JiraIssue) => (
    <Card key={issue.self} radius="md" shadow="sm" padding="sm" withBorder>
      <Group style={{ alignItems: 'center' }}>
        <Text fw={600} size="xs">
          {issue.fields.summary || '-'}
        </Text>
      </Group>
      <Group style={{ alignItems: 'center' }}>
        <Text size="xs">Issue Type:</Text>
        <Text size="xs">{issue.fields.issuetype?.name || '-'}</Text>
      </Group>
      <Group style={{ alignItems: 'center' }}>
        <Text size="xs">Story Points:</Text>
        <Text size="xs">{issue.storyPoints || '-'}</Text>
      </Group>
      <Group style={{ alignItems: 'center' }}>
        <Text size="xs">Assignee:</Text>
        <Text size="xs">{issue.fields.assignee?.displayName || '-'}</Text>
      </Group>
    </Card>
  );

  const getStatsTable = (jiraSprints: JiraSprint[]) => {
    const assigneeStatsArrays: Record<string, AssigneeStats[]> = {};

    jiraSprints
      .filter(sprint => sprint.state !== 'future')
      .forEach(jiraSprint => {
        const assigneeStatsMap: Record<string, AssigneeStats> = {};
        let totalIssues = 0;
        let totalStoryPoints = 0;

        jiraSprint.jiraIssues.forEach(issue => {
          const assigneeName =
            issue.fields.assignee?.displayName ?? 'Unassigned';
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

        const endKeys = ['Unassigned', 'Total'];

        const assigneeStatsArray: AssigneeStats[] = Object.values(
          assigneeStatsMap
        ).sort((a, b) => {
          // Check if the keys are in the endKeys array
          const indexA = endKeys.indexOf(a.assignee);
          const indexB = endKeys.indexOf(b.assignee);

          // If both keys are in the endKeys array, sort based on their position in the endKeys array
          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }

          // If only one key is in the endKeys array, place it at the end
          if (indexA !== -1) return 1;
          if (indexB !== -1) return -1;

          // For other keys, sort based on the key string (ascending order)
          return a.assignee.localeCompare(b.assignee);
        });

        // Calculate average story points per issue for each assignee
        assigneeStatsArray.forEach(assigneeStats => {
          assigneeStats.storyPointsPerIssue =
            assigneeStats.issues > 0
              ? assigneeStats.storyPoints / assigneeStats.issues
              : 0;
        });

        const startDate = new Date(jiraSprint.startDate);
        assigneeStatsArrays[startDate.toISOString()] = assigneeStatsArray;
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
          <Table.Td
          // c={
          //   assigneeStats.storyPointsPerIssue <= 16 / storyPointsEstimate
          //     ? 'teal.7'
          //     : 'red.7'
          // }
          >
            {assigneeStats.storyPointsPerIssue.toFixed(2)}
          </Table.Td>
        </Table.Tr>
      ));

    return (
      <Card withBorder>
        {/* <NumberInput
          label="Number of hours per story point"
          value={storyPointsEstimate}
          onChange={handleStoryPointsEstimateChange}
          min={1}
          step={1}
          clampBehavior="strict"
          allowNegative={false}
          w={'30%'}
        /> */}
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
              <Group pl={'6%'} pr={'6%'} pt={'2%'}>
                <Table
                  striped
                  highlightOnHover
                  withTableBorder
                  withColumnBorders
                >
                  <Table.Caption>
                    Sprint starting{' '}
                    {new Date(sortedKeys[index]).toLocaleDateString()}
                  </Table.Caption>
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
    const sprintData: SprintSummary[] = [];

    jiraSprints
      .filter(sprint => sprint.state !== 'future')
      .forEach(sprint => {
        const sprintSummary: SprintSummary = {
          startDate: new Date(sprint.startDate),
          startDateString: new Date(sprint.startDate).toLocaleDateString(),
          'Story Points Commitment': 0,
          'Issues Commitment': 0,
          'Story Points Completed': 0,
          'Issues Completed': 0,
        };

        sprint.jiraIssues.forEach(issue => {
          sprintSummary['Issues Commitment'] += 1;
          sprintSummary['Story Points Commitment'] += issue.storyPoints ?? 0;

          if (
            issue.fields.resolution &&
            issue.fields.resolution.name === 'Done'
          ) {
            sprintSummary['Issues Completed'] += 1;
            sprintSummary['Story Points Completed'] += issue.storyPoints ?? 0;
          }
        });

        sprintData.push(sprintSummary);
      });

    sprintData.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    // Calculate the total completed story points
    const totalCompletedStoryPoints = sprintData.reduce(
      (acc, sprintSummary) => acc + sprintSummary['Story Points Completed'],
      0
    );

    // Calculate the velocity (average completed story points)
    const storyPointsVelocity =
      sprintData.length > 0 ? totalCompletedStoryPoints / sprintData.length : 0;

    // Calculate the total completed issues
    const totalCompletedIssues = sprintData.reduce(
      (acc, sprintSummary) => acc + sprintSummary['Issues Completed'],
      0
    );

    // Calculate the velocity (average completed issues)
    const issuesVelocity =
      sprintData.length > 0 ? totalCompletedIssues / sprintData.length : 0;

    return (
      <Card withBorder>
        <Select
          data={[
            { value: VelocityChartType.StoryPoints, label: 'Story Points' },
            { value: VelocityChartType.Issues, label: 'Issues' },
          ]}
          value={selectedVelocityChart}
          allowDeselect={false}
          onChange={(_value, option) =>
            setSelectedVelocityChart(option.value as VelocityChartType)
          }
          pos={'absolute'}
          top={'15'}
          left={'15'}
        />
        <Text size="sm" fw={500} ta={'center'} mb={'8'}>
          Velocity Chart
        </Text>
        {selectedVelocityChart === VelocityChartType.StoryPoints && (
          <div>
            <BarChart
              h={400}
              data={sprintData}
              dataKey="startDateString"
              xAxisLabel="Sprint"
              yAxisLabel="Story Points"
              withLegend
              legendProps={{ verticalAlign: 'top' }}
              series={[
                { name: 'Story Points Commitment', color: 'gray.5' },
                { name: 'Story Points Completed', color: 'teal.7' },
              ]}
            />
            <Group style={{ alignItems: 'center' }}>
              <Text size="sm">Team's Velocity:</Text>
              <Text size="sm">{storyPointsVelocity.toFixed(2)}</Text>
            </Group>
          </div>
        )}
        {selectedVelocityChart === VelocityChartType.Issues && (
          <div>
            <BarChart
              h={400}
              data={sprintData}
              dataKey="endDateString"
              xAxisLabel="Sprint"
              yAxisLabel="Issues"
              withLegend
              legendProps={{ verticalAlign: 'top' }}
              series={[
                { name: 'Issues Commitment', color: 'gray.5' },
                { name: 'Issues Completed', color: 'teal.7' },
              ]}
            />
            <Group style={{ alignItems: 'center' }}>
              <Text size="sm">Team's Velocity:</Text>
              <Text size="sm">{issuesVelocity.toFixed(2)}</Text>
            </Group>
          </div>
        )}
      </Card>
    );
  };

  const getActiveSprint = (jiraBoard: JiraBoard) => {
    return jiraBoard.jiraSprints.find(sprint => sprint.state === 'active');
  };

  const getActiveSprintName = (jiraBoard: JiraBoard) => {
    const activeSprint = getActiveSprint(jiraBoard);
    return <Text>{activeSprint ? activeSprint.name : 'No active sprint'}</Text>;
  };

  const getActiveSprintStartDate = (jiraBoard: JiraBoard) => {
    const activeSprint = getActiveSprint(jiraBoard);

    if (!activeSprint) {
      return <Text>{'No active sprint'}</Text>;
    }

    const startDate = new Date(activeSprint.startDate);
    return (
      <Text>
        {startDate.toLocaleTimeString()}, {startDate.toLocaleDateString()}
      </Text>
    );
  };

  const getActiveSprintEndDate = (jiraBoard: JiraBoard) => {
    const activeSprint = getActiveSprint(jiraBoard);

    if (!activeSprint) {
      return <Text>{'No active sprint'}</Text>;
    }

    if (!activeSprint.endDate) {
      return <Text>{'-'}</Text>;
    }

    const endDate = new Date(activeSprint.endDate);
    return (
      <Text>
        {endDate.toLocaleTimeString()}, {endDate.toLocaleDateString()}
      </Text>
    );
  };

  const jiraCard = (
    <Stack>
      <Group style={{ alignItems: 'center' }}>
        <Text>Teaching Assistant:</Text>
        <Text>{TA ? TA.name : 'None'}</Text>
      </Group>
      <Group style={{ alignItems: 'center' }}>
        <Text>Project Board:</Text>
        <Text>{jiraBoard ? jiraBoard.jiraLocation.projectName : 'None'}</Text>
      </Group>
      {jiraBoard && (
        <div>
          <Group>
            <Text>Current Sprint:</Text>
            {getActiveSprintName(jiraBoard)}
          </Group>
          <Group>
            <Text>Start Date:</Text>
            {getActiveSprintStartDate(jiraBoard)}
          </Group>
          <Group>
            <Text>End Date:</Text>
            {getActiveSprintEndDate(jiraBoard)}
          </Group>
          {jiraBoard.jiraSprints && (
            <Card withBorder>
              <MultiSelect
                data={[
                  ...new Set(
                    jiraBoard.jiraSprints
                      .find(sprint => sprint.state === 'active')
                      ?.jiraIssues.map(
                        issue =>
                          issue.fields.assignee?.displayName || 'Unassigned'
                      )
                  ),
                ]}
                value={selectedAssignees}
                onChange={setSelectedAssignees}
                placeholder="Select Assignees"
                label="Filter by Assignee"
              />
              {getActiveSprintBoard(
                jiraBoard.jiraSprints.find(sprint => sprint.state === 'active'),
                jiraBoard.columns
              )}
            </Card>
          )}

          {jiraBoard.jiraSprints && getStatsTable(jiraBoard.jiraSprints)}
          {jiraBoard.jiraSprints && getVelocityChart(jiraBoard.jiraSprints)}
        </div>
      )}
    </Stack>
  );

  return (
    <div>
      {renderTutorialPopover ? (
        <TutorialPopover
          stage={22}
          position="left"
        >
          {jiraCard}
        </TutorialPopover>
      ) : (
        jiraCard
      )}
    </div>
  );
};

export default ProjectManagementJiraCard;
