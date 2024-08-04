import { BarChart } from '@mantine/charts';
import { Card, Group, Stack, Text } from '@mantine/core';
import { GitHubProject, Issue } from '@shared/types/GitHubProjectData';
import { TeamData } from '@shared/types/TeamData';
import { User } from '@shared/types/User';

interface ProjectManagementGitHubCardProps {
  TA: User | null;
  gitHubProject: GitHubProject | null;
  teamData: TeamData | null;
}

interface SprintSummary {
  endDate: Date;
  endDateString: string;
  'Issues Commitment': number;
  'Issues Completed': number;
}

const ProjectManagementGitHubProjectCard: React.FC<
  ProjectManagementGitHubCardProps
> = ({ TA, gitHubProject, teamData }) => {
  const getMilestoneTitle = (teamData: TeamData) => {
    const openMilestone = teamData.milestones.find(
      milestone => milestone.state === 'open'
    );
    return <Text>{openMilestone ? openMilestone.title : 'None'}</Text>;
  };

  const getVelocityChart = (gitHubProject: GitHubProject) => {
    const milestoneMap = new Map<string, SprintSummary>();

    gitHubProject.items.forEach(item => {
      if (item.type === 'ISSUE') {
        const issue = item.content as Issue;
        if (issue.milestone) {
          const milestone = issue.milestone;
          if (!milestoneMap.has(milestone.title)) {
            milestoneMap.set(milestone.title, {
              // endDate: new Date(milestone.dueOn),
              // endDateString: milestone.dueOn.toISOString(),
              endDate: new Date(milestone.createdAt),
              endDateString: new Date(milestone.createdAt).toLocaleDateString(),
              'Issues Commitment': 0,
              'Issues Completed': 0,
            });
          }

          const summary = milestoneMap.get(milestone.title)!;
          summary['Issues Commitment'] += 1;

          // Assuming an issue is considered completed if it has a milestone
          summary['Issues Completed'] += 1; // Adjust this logic based on your criteria for completed issues
        }
      }
    });

    const sprintData: SprintSummary[] = Array.from(milestoneMap.values());

    sprintData.sort((a, b) => a.endDate.getTime() - b.endDate.getTime());

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
        <Text size="sm" fw={500} ta={'center'} mb={'8'}>
          Velocity Chart
        </Text>
        {
          <>
            <BarChart
              h={400}
              data={sprintData}
              dataKey="endDateString"
              xAxisLabel="Milestone"
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
          </>
        }
      </Card>
    );
  };

  console.log(gitHubProject);

  return (
    <Stack>
      <Group style={{ alignItems: 'center' }}>
        <Text>Teaching Assistant:</Text>
        <Text>{TA ? TA.name : 'None'}</Text>
      </Group>
      <Group style={{ alignItems: 'center' }}>
        <Text>GitHub Project:</Text>
        <Text>{gitHubProject ? gitHubProject.title : 'None'}</Text>
      </Group>
      {teamData && gitHubProject && (
        <>
          <Group style={{ alignItems: 'center' }}>
            <Text>Current Milestone:</Text>
            {getMilestoneTitle(teamData)}
          </Group>
          {getVelocityChart(gitHubProject)}
        </>
      )}
    </Stack>
  );
};

export default ProjectManagementGitHubProjectCard;
