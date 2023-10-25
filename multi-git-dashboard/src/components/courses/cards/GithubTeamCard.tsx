import {
  Text,
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
import { TeamData } from '@shared/types/TeamData';
import { useState } from 'react';
import { Milestone, Sprint, isSprint } from '@shared/types/Course';

interface GithubTeamCardProps {
  teamData: TeamData;
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
    setActive(current =>
      current < stepperSteps.length ? current + 1 : current
    );
  const prevStep = () =>
    setActive(current => (current > 0 ? current - 1 : current));

  const chartData = [
    { name: 'Commits', value: teamData.commits },
    { name: 'Issues', value: teamData.issues },
    { name: 'PRs', value: teamData.pullRequests },
  ];

  const commitsData = [];
  const composedChartData = [];
  const prsData = [];
  const reviewsData = [];
  const issuesData = [];
  for (const contributor in teamData.teamContributions) {
    const contribution = teamData.teamContributions[contributor];
    commitsData.push({
      name: contributor,
      commits: contribution.commits,
    });
    prsData.push({
      name: contributor,
      prs: contribution.pullRequests,
    });
    reviewsData.push({
      name: contributor,
      reviews: contribution.reviews,
    });
    issuesData.push({
      name: contributor,
      created: contribution.createdIssues,
      open: contribution.openIssues,
      closed: contribution.closedIssues,
    });
    composedChartData.push({
      name: contributor,
      additions: contribution.additions,
      deletions: contribution.deletions,
    });
  }

  const stepperSteps = [...sprints, ...milestones]
    .sort((a, b) => {
      const dateA =
        'startDate' in a ? (a as Sprint).startDate : (a as Milestone).dateline;
      const dateB =
        'startDate' in b ? (b as Sprint).startDate : (b as Milestone).dateline;
      return dateA.getTime() - dateB.getTime();
    })
    .map((item, index) =>
      isSprint(item) ? (
        <Stepper.Step key={index} label={`Sprint ${item.number}`}>
          <Text>Start: {item.startDate.toLocaleDateString()}</Text>
          <Text>End: {item.endDate.toLocaleDateString()}</Text>
          <Text>{(item as Sprint).description}</Text>
        </Stepper.Step>
      ) : (
        <Stepper.Step key={index} label={`Milestone ${item.number}`}>
          <Text>Deadline: {item.dateline.toLocaleDateString()}</Text>
          <Text>{item.description}</Text>
        </Stepper.Step>
      )
    );

  return (
    <Card withBorder p="xl" radius="md" ml={40} mr={60} my={10}>
      <Grid gutter="xs">
        <Grid.Col span={6}>
          <Grid>
            <Grid.Col span={12}>
              <Text size="xl" fw={700}>
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
            </Grid.Col>
            <Grid.Col span={12}>
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
            </Grid.Col>
          </Grid>
        </Grid.Col>
        <Grid.Col span={6}>
          <Grid>
            <Grid.Col span={12}>
              <Stack w={100}>
                <Badge color="yellow">Stars: {teamData.stars}</Badge>
                <Badge color="teal">Forks: {teamData.forks}</Badge>
              </Stack>
            </Grid.Col>
            <Grid.Col span={12}>
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
            </Grid.Col>
          </Grid>
        </Grid.Col>
        <Grid.Col span={6}>
          <Text size="xl" fw={700} mb={15}>
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
        </Grid.Col>

        <Grid.Col span={6}>
          <Text size="xl" fw={700} mb={15}>
            Progress
          </Text>
          <Stepper
            active={active}
            onStepClick={setActive}
            orientation="vertical"
          >
            {stepperSteps}
          </Stepper>
          <Group justify="center" mt="xl">
            <Button variant="default" onClick={prevStep}>
              Back
            </Button>
            <Button onClick={nextStep}>Next step</Button>
          </Group>
        </Grid.Col>
        <Grid.Col span={6}>
          <Container>
            <BarChart width={300} height={250} data={commitsData}></BarChart>
            <BarChart width={300} height={250} data={prsData}></BarChart>
            <BarChart width={300} height={250} data={reviewsData}></BarChart>
            <BarChart width={300} height={250} data={issuesData}></BarChart>
          </Container>
        </Grid.Col>
      </Grid>
    </Card>
  );
};

export default GithubTeamCard;
