import {
  Badge,
  Card,
  Container,
  Grid,
  Stepper,
  Text,
} from '@mantine/core';
import { Milestone, Sprint, isSprint } from '@shared/types/Course';
import { TeamData } from '@shared/types/TeamData';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  const [active, setActive] = useState(1);

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
        {/* <Grid.Col span={6}>
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
        </Grid.Col> */}
        <Grid.Col span={6}>
          <Text size="xl" fw={700} mb={15}>
            Contributors
          </Text>
          <Container>
            <BarChart width={300} height={300} data={commitsData}>
              <CartesianGrid stroke="#f5f5f5" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="commits" fill="#8884d8" />
            </BarChart>
          </Container>
        </Grid.Col>
        <Grid.Col span={6}>
          <Text size="xl" fw={700} mb={15}>
            Code Changes
          </Text>
          <Container>
            <ComposedChart width={300} height={300} data={composedChartData}>
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
            Issues
          </Text>
          <BarChart width={300} height={300} data={issuesData}>
            <CartesianGrid stroke="#f5f5f5" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="created" fill="#8884d8" />
            <Bar dataKey="open" fill="#82ca9d" />
            <Bar dataKey="closed" fill="#ffc658" />
          </BarChart>
        </Grid.Col>
        <Grid.Col span={12}>
          <Stepper active={active} onStepClick={setActive}>
            {stepperSteps}
          </Stepper>
        </Grid.Col>

        {/* <Grid.Col span={6}>
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
            <BarChart width={300} height={250} data={prsData}>
              <CartesianGrid stroke="#f5f5f5" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="prs" fill="#8884d8" />
            </BarChart>
            <BarChart width={300} height={250} data={reviewsData}>
              <CartesianGrid stroke="#f5f5f5" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="reviews" fill="#8884d8" />
            </BarChart>
          </Container>
        </Grid.Col> */}
      </Grid>
    </Card>
  );
};

export default GithubTeamCard;
