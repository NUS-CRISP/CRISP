import { useState, forwardRef } from 'react';
import {
  Card,
  Stack,
  Select,
  MultiSelect,
  Group,
  Title,
  Popover,
  Button,
} from '@mantine/core';
import { AreaChart, BarChart } from '@mantine/charts';
import { TeamData } from '@shared/types/TeamData';
import classes from '@/styles/course-overview.module.css';

interface AllTeamsProps {
  teamDatas: TeamData[];
}

const AllTeams = forwardRef<HTMLDivElement, AllTeamsProps>(
  ({ teamDatas }, ref) => {
    const [chartType, setChartType] = useState<string>('AreaChart');
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
      'pullRequests',
      'commits',
      'issues',
    ]);
    const [singleMetric, setSingleMetric] = useState<string>('pullRequests');
    const [sortType, setSortType] = useState<string>('all');

    const uniqueTeamData = teamDatas.filter(
      (team, index, self) =>
        index === self.findIndex(t => t.repoName === team.repoName)
    );

    const [selectedTeams, setSelectedTeams] = useState<string[]>(
      uniqueTeamData.map(team => team.repoName)
    );

    const data = uniqueTeamData
      .filter(teamData => selectedTeams.includes(teamData.repoName))
      .map(teamData => ({
        teamName: teamData.repoName,
        commits: teamData.commits,
        issues: teamData.issues,
        pullRequests: teamData.pullRequests,
      }));

    const availableMetrics = [
      { value: 'issues', label: 'Issues' },
      { value: 'commits', label: 'Commits' },
      { value: 'pullRequests', label: 'Pull Requests' },
    ];

    const filterAndSortData = () => {
      const sortedData = [...data];

      if (sortType === 'ascending') {
        sortedData.sort((a, b) => {
          const metricA = a[singleMetric as keyof typeof a];
          const metricB = b[singleMetric as keyof typeof b];

          return (metricA as number) - (metricB as number);
        });
      } else if (sortType === 'descending') {
        sortedData.sort((a, b) => {
          const metricA = a[singleMetric as keyof typeof a];
          const metricB = b[singleMetric as keyof typeof b];

          return (metricB as number) - (metricA as number);
        });
      }

      return sortedData;
    };

    const sortedData = filterAndSortData();

    const chartData = sortedData.map(team => ({
      teamName: team.teamName,
      ...selectedMetrics.reduce(
        (acc, metric) => ({
          ...acc,
          [metric]: team[metric as keyof typeof team],
        }),
        {}
      ),
    }));

    const series = selectedMetrics.map((metric, index) => ({
      name: metric.charAt(0) + metric.slice(1),
      color: ['violet.6', 'blue.6', 'teal.6', 'orange.6'][index % 4],
    }));

    const chartHeight = 460;
    const renderChart = () => {
      if (chartType === 'BarChart') {
        return (
          <BarChart
            h={chartHeight}
            data={chartData}
            dataKey="teamName"
            series={series}
            tickLine="xy"
          />
        );
      }
      if (chartType === 'AreaChart') {
        return (
          <AreaChart
            h={chartHeight}
            data={chartData}
            dataKey="teamName"
            series={series}
            curveType="linear"
            tickLine="xy"
            gridAxis="xy"
          />
        );
      }
      return null;
    };

    const teamNames = uniqueTeamData.map(teamName => ({
      value: teamName.repoName,
      label: teamName.repoName,
    }));

    return (
      <Card
        withBorder
        ref={ref}
        className={classes.overviewChartCard}
        p={22}
      >
        <Stack gap={0}>
          <Title order={3} className={classes.overviewChartTitle}>
            All Teams Overview
          </Title>

          <Group justify="center" mb={10}>
            <Popover width={900} position="bottom" withArrow shadow="md">
              <Popover.Target>
                <Button>Select team(s) to display</Button>
              </Popover.Target>
              <Popover.Dropdown>
                <MultiSelect
                  label="Select Teams"
                  placeholder="Select teams to display"
                  value={selectedTeams}
                  onChange={setSelectedTeams}
                  data={teamNames}
                  withScrollArea
                  searchable
                  clearable
                  maxDropdownHeight={200}
                  styles={{ input: { minHeight: 36 } }}
                  comboboxProps={{ withinPortal: false }}
                />
              </Popover.Dropdown>
            </Popover>
          </Group>

          <div className={classes.overviewChartControls}>
            <Select
              label="Chart Type"
              value={chartType}
              onChange={(value: string | null) => value && setChartType(value)}
              data={[
                { value: 'BarChart', label: 'Bar Chart' },
                { value: 'AreaChart', label: 'Area Chart' },
              ]}
            />
            <Select
              label="Single Metric for Sorting"
              value={singleMetric}
              onChange={(value: string | null) => value && setSingleMetric(value)}
              data={availableMetrics}
            />
            <MultiSelect
              label="Metrics"
              value={selectedMetrics}
              onChange={setSelectedMetrics}
              data={availableMetrics}
            />
            <Select
              label="Sort By"
              value={sortType}
              onChange={(value: string | null) => value && setSortType(value)}
              data={[
                { value: 'all', label: 'No Sorting' },
                { value: 'ascending', label: 'Ascending Order' },
                { value: 'descending', label: 'Descending Order' },
              ]}
            />
          </div>

          <div className={classes.overviewChartArea}>{renderChart()}</div>
        </Stack>
      </Card>
    );
  }
);

export default AllTeams;
