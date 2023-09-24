import { Text, Col, Grid, Badge, Card, Progress, Stack, RingProgress, useMantineTheme } from '@mantine/core';
import { Tooltip, Legend, Cell, Pie, PieChart } from 'recharts';
import { Milestone, TeamData as GithubTeamData } from '@/types/teamdata';

interface GithubTeamCardProps {
  teamData: GithubTeamData;
  milestones: Milestone[];
}

const GithubTeamCard: React.FC<GithubTeamCardProps> = ({ teamData }) => {
  const theme = useMantineTheme();

  const totalIssues = teamData.issues;
  const completedIssues = teamData.updatedIssues.length;
  const issuesProgress = completedIssues == 0 ? 100 : (completedIssues / totalIssues) * 100;

  // Data for Pie chart
  const chartData = [
    { name: 'Commits', value: teamData.commits },
    { name: 'Issues', value: teamData.issues },
    { name: 'PRs', value: teamData.pullRequests },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  return (
    <Card withBorder p="xl" radius="md" ml={40} mr={60} my={10}>
      <Grid gutter="xs">
        <Col span={6}>
          <Grid>
            <Col span={12}>
              <Text size="xl" weight={700}>
                {teamData.repoName}
              </Text>
              <Badge color="blue" mr={5}>
                Commits: {teamData.commits}
              </Badge>
              <Badge color="red" mx={5}>
                Issues: {teamData.issues}
              </Badge>
              <Badge color="green" mx={5}>
                PRs: {teamData.pullRequests}
              </Badge>
            </Col>
            <Col span={12}>
              <PieChart width={300} height={220}>
                <Pie
                  data={chartData}
                  cx={300 / 2}
                  cy={100}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {
                    chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)
                  }
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </Col>
          </Grid>
        </Col>
        <Col span={6}>
          <Grid>
            <Col span={12}>
              <Stack w={100}>
                <Badge color="yellow">
                  Stars: {teamData.stars}
                </Badge>
                <Badge color="teal">
                  Forks: {teamData.forks}
                </Badge>
              </Stack>
            </Col>
            <Col span={12}>
              <Text c="dimmed" fz="sm" mt="md">
                Issues completed:{' '}
                <Text span fw={500} c="bright">
                  {completedIssues}/{totalIssues}
                </Text>
              </Text>
              <RingProgress
                roundCaps
                thickness={6}
                size={150}
                sections={[{ value: issuesProgress, color: theme.primaryColor }]}
                label={
                  <div>
                    <Text ta="center" fz="lg" >
                      {issuesProgress.toFixed(0)}%
                    </Text>
                    <Text ta="center" fz="xs" c="dimmed">
                      Completed
                    </Text>
                  </div>
                }
              />
            </Col>
          </Grid>
        </Col>
      </Grid>
    </Card>
  );
};

export default GithubTeamCard;
