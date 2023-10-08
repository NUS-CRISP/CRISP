import {
  Text,
  Col,
  Grid,
  Badge,
  Card,
  Stack,
  RingProgress,
  useMantineTheme,
  Stepper,
  Button,
  Group,
  Container,
} from '@mantine/core';
import {
  Tooltip,
  Legend,
  Cell,
  Pie,
  PieChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ComposedChart,
  Line,
} from 'recharts';
import { ITeamData } from '@backend/models/TeamData';
import { Milestone, Sprint, isSprint } from '@/types/course';
import { useState } from 'react';

interface GithubTeamCardProps {
  teamData: ITeamData;
  milestones: Milestone[];
  sprints: Sprint[];
}

const GithubTeamCard: React.FC<GithubTeamCardProps> = ({
  teamData,
  milestones,
  sprints,
}) => {
  const theme = useMantineTheme();
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  const totalIssues = teamData.issues;
  const completedIssues = teamData.updatedIssues.length;
  const issuesProgress =
    completedIssues === 0 ? 100 : (completedIssues / totalIssues) * 100;

  const [active, setActive] = useState(1);
  const nextStep = () =>
    setActive((current: number) =>
      current < stepperSteps.length ? current + 1 : current
    );
  const prevStep = () =>
    setActive((current: number) => (current > 0 ? current - 1 : current));

  // Data for Pie chart
  const chartData = [
    { name: 'Commits', value: teamData.commits },
    { name: 'Issues', value: teamData.issues },
    { name: 'PRs', value: teamData.pullRequests },
  ];
  const commitsData = [];
  const composedChartData = [];
  for (const contributor in teamData.teamContributions) {
    const contribution = teamData.teamContributions[contributor];
    commitsData.push({
      name: contributor,
      commits: contribution.commits,
    });
    composedChartData.push({
      name: contributor,
      additions: contribution.additions,
      deletions: contribution.deletions,
    });
  }

  const stepperSteps = [...sprints, ...milestones]
    .sort((a, b) => {
      const dateA = 'startDate' in a ? a.startDate : a.dateline;
      const dateB = 'startDate' in b ? b.startDate : b.dateline;
      return dateA.getTime() - dateB.getTime();
    })
    .map((item, index) =>
      isSprint(item) ? (
        <Stepper.Step key={index} label={`Sprint ${item.sprintNumber}`}>
          <Text>Start: {item.startDate.toLocaleDateString()}</Text>
          <Text>End: {item.endDate.toLocaleDateString()}</Text>
          <Text>{item.description}</Text>
        </Stepper.Step>
      ) : (
        <Stepper.Step key={index} label={`Milestone ${item.milestoneNumber}`}>
          <Text>Deadline: {item.dateline.toLocaleDateString()}</Text>
          <Text>{item.description}</Text>
        </Stepper.Step>
      )
    );

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
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
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
                <Badge color="yellow">Stars: {teamData.stars}</Badge>
                <Badge color="teal">Forks: {teamData.forks}</Badge>
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
                sections={[
                  { value: issuesProgress, color: theme.primaryColor },
                ]}
                label={
                  <div>
                    <Text ta="center" fz="lg">
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
        <Col span={6}>
          <Text size="xl" weight={700} mb={15}>
            Contributors
          </Text>
          <Container>
            <BarChart width={300} height={250} data={commitsData}>
              <CartesianGrid stroke="#f5f5f5" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="commits" fill="#8884d8" />
            </BarChart>
            <ComposedChart width={300} height={250} data={composedChartData}>
              <CartesianGrid stroke="#f5f5f5" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="additions" stroke="#ff7300" />
              <Line type="monotone" dataKey="deletions" stroke="#387908" />
            </ComposedChart>
          </Container>
        </Col>

        <Col span={6}>
          <Text size="xl" weight={700} mb={15}>
            Progress
          </Text>
          <Stepper
            active={active}
            onStepClick={setActive}
            breakpoint="sm"
            orientation="vertical"
          >
            {stepperSteps}
          </Stepper>
          <Group position="center" mt="xl">
            <Button variant="default" onClick={prevStep}>
              Back
            </Button>
            <Button onClick={nextStep}>Next step</Button>
          </Group>
        </Col>
      </Grid>
    </Card>
  );
};

export default GithubTeamCard;
