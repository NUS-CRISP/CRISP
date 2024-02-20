import { mergeDedupe } from '@/lib/utils';
import {
  ActionIcon,
  Button,
  Card,
  Container,
  Drawer,
  ScrollArea,
  Select,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Course } from '@shared/types/Course';
import { useState } from 'react';
import GithubTeamCard from '../cards/GithubTeamCard';

interface OverviewProps {
  course: Course;
}

const Overview: React.FC<OverviewProps> = ({ course }) => {
  const FOOTER_HEIGHT = 60;
  const allMetrics = ['Commits', 'Issues', 'PRs', 'Reviews', 'Contributions']; // All possible metrics

  const allTeams = mergeDedupe(
    (r1, r2) => r1._id === r2._id,
    ...course.teamSets.map(ts => ts.teams)
  ).filter(team => team.teamData);

  const [opened, { open, close }] = useDisclosure(false);
  const [selectedMetrics, setSelectedMetrics] = useState([
    'Commits',
    'Issues',
    'PRs',
  ]); // Example initial metrics
  const [availableMetricsValue] = useState<string | null>(null);

  const removeMetric = (metricToRemove: string) => {
    setSelectedMetrics(
      selectedMetrics.filter(metric => metric !== metricToRemove)
    );
  };

  const addMetric = (metricToAdd: string | null) => {
    if (!metricToAdd) return;
    if (!selectedMetrics.includes(metricToAdd)) {
      setSelectedMetrics([...selectedMetrics, metricToAdd]);
      // setAvailableMetricsValue(null);
    }
  };

  // Filter out the selected metrics from the list of all possible metrics
  const availableMetrics = allMetrics.filter(
    metric => !selectedMetrics.includes(metric)
  );

  return (
    <>
      <Drawer
        opened={opened}
        onClose={close}
        title="Customisation"
        position="right"
      >
        <div>
          {selectedMetrics.map(metric => (
            <Card
              key={metric}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
                borderRadius: '20px',
              }}
            >
              <Text>{metric}</Text>
              <ActionIcon onClick={() => removeMetric(metric)}>
                <span>X</span> {/* Replace with appropriate icon */}
              </ActionIcon>
            </Card>
          ))}
          <Select
            data={availableMetrics}
            value={availableMetricsValue}
            placeholder="Add metric"
            withCheckIcon={false}
            searchable
            clearable
            onChange={addMetric}
          />
        </div>
      </Drawer>
      <ScrollArea.Autosize mah={`calc(100dvh - 4 * 20px - ${FOOTER_HEIGHT}px)`}>
        {allTeams.map((team, index) => (
          <GithubTeamCard
            key={index}
            teamData={team.teamData}
            milestones={course.milestones}
            sprints={course.sprints}
          />
        ))}
      </ScrollArea.Autosize>
      <Container h={FOOTER_HEIGHT}>
        <Button onClick={open} mt={20}>
          Customise
        </Button>
      </Container>
    </>
  );
};

export default Overview;
