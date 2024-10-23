import { useState, forwardRef } from 'react';
import {
  Card,
  Stack,
  Select,
  MultiSelect,
  Group,
  Center,
  Title,
  Popover,
  Button,
} from '@mantine/core';
import { AreaChart, BarChart } from '@mantine/charts';
import { TeamData } from '@shared/types/TeamData';

interface AllTeamsProps {
  teamDatas: TeamData[];
}

const AllTeams = forwardRef<HTMLDivElement, AllTeamsProps>(
  ({ teamDatas }, ref) => {
    const [chartType, setChartType] = useState<string>('AreaChart');
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
      'issues',
    ]);
    const [singleMetric, setSingleMetric] = useState<string>('issues');
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

    const renderChart = () => {
      if (chartType === 'BarChart') {
        return (
          <div style={{ paddingRight: '20px' }}>
            <BarChart
              h={460}
              data={chartData}
              dataKey="teamName"
              series={series}
              tickLine="xy"
            />
          </div>
        );
      } else if (chartType === 'AreaChart') {
        return (
          <div style={{ paddingRight: '20px' }}>
            <AreaChart
              h={460}
              data={chartData}
              dataKey="teamName"
              series={series}
              curveType="linear"
              tickLine="xy"
              gridAxis="xy"
            />
          </div>
        );
      }
    };

    const teamNames = uniqueTeamData.map(teamName => ({
      value: teamName.repoName,
      label: teamName.repoName,
    }));

    return (
      <div>
        <Card
          withBorder
          ref={ref}
          style={{ marginTop: '10px', marginBottom: '10px' }}
        >
          <Stack>
            <Center>
              <Title order={5}>All Teams Overview</Title>
            </Center>

            <Group justify="center">
              <Popover width={900} position="bottom" withArrow shadow="md">
                <Popover.Target>
                  <Button style={{ width: '250px' }}>
                    Select team(s) to display
                  </Button>
                </Popover.Target>
                <Popover.Dropdown>
                  <MultiSelect
                    label="Select Teams"
                    placeholder="Select teams to display"
                    value={selectedTeams}
                    onChange={setSelectedTeams}
                    data={teamNames}
                    withScrollArea={true}
                    searchable
                    clearable
                    maxDropdownHeight={200}
                    styles={{
                      input: { minHeight: '36px' },
                    }}
                    comboboxProps={{ withinPortal: false }}
                  />
                </Popover.Dropdown>
              </Popover>
            </Group>

            <Group grow>
              <Select
                label="Chart Type"
                placeholder="Select chart type"
                value={chartType}
                onChange={(value: string | null) => {
                  if (value) setChartType(value);
                }}
                data={[
                  { value: 'BarChart', label: 'Bar Chart' },
                  { value: 'AreaChart', label: 'Area Chart' },
                ]}
              />

              <MultiSelect
                label="Metrics"
                value={selectedMetrics}
                onChange={setSelectedMetrics}
                data={availableMetrics}
              />
            </Group>

            <Group grow>
              <Select
                label="Single Metric for Sorting"
                placeholder="Select a metric"
                value={singleMetric}
                onChange={(value: string | null) => {
                  if (value) setSingleMetric(value);
                }}
                data={availableMetrics}
              />

              <Select
                label="Sort By"
                placeholder="Select sorting option"
                value={sortType}
                onChange={(value: string | null) => {
                  if (value) setSortType(value);
                }}
                data={[
                  { value: 'all', label: 'No Sorting' },
                  { value: 'ascending', label: 'Ascending Order' },
                  { value: 'descending', label: 'Descending Order' },
                ]}
              />
            </Group>

            {renderChart()}
          </Stack>
        </Card>
      </div>
    );
  }
);

export default AllTeams;
