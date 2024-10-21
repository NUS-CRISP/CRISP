import { useState, forwardRef } from 'react';
import { Card, Stack, Title, Center, Select, MultiSelect } from '@mantine/core';
import { AreaChart, BarChart } from '@mantine/charts';
import { TeamData } from '@shared/types/TeamData';

interface AllTeamsProps {
  teamDatas: TeamData[];
}

const AllTeams = forwardRef<HTMLDivElement, AllTeamsProps>(
  ({ teamDatas }, ref) => {
    const [chartType, setChartType] = useState<string>('BarChart');
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
      'commits',
      'issues',
    ]);
    const [singleMetric, setSingleMetric] = useState<string>('commits');
    const [sortType, setSortType] = useState<string>('all');

    const uniqueTeams = new Set<string>();
    const data = teamDatas
      .filter(teamData => {
        if (uniqueTeams.has(teamData.repoName)) {
          return false;
        }
        uniqueTeams.add(teamData.repoName);
        return true;
      })
      .map(teamData => ({
        teamName: teamData.repoName,
        commits: teamData.commits,
        issues: teamData.issues,
        pullRequests: teamData.pullRequests,
        weeklyCommits: teamData.weeklyCommits.length,
      }))
      .sort((a, b) => a.teamName.localeCompare(b.teamName));

    const availableMetrics = [
      { value: 'commits', label: 'Commits' },
      { value: 'issues', label: 'Issues' },
      { value: 'pullRequests', label: 'Pull Requests' },
      { value: 'weeklyCommits', label: 'Weekly Commits' },
    ];

    const chartData = data.map(team => ({
      teamName: team.teamName,
      ...selectedMetrics.reduce(
        (acc, metric) => ({
          ...acc,
          [metric]: team[metric as keyof typeof team],
        }),
        {}
      ),
    }));

    const filterAndSortData = () => {
      let sortedData = [...data];

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
      } else if (sortType === 'top') {
        sortedData.sort((a, b) => {
          const metricA = a[singleMetric as keyof typeof a];
          const metricB = b[singleMetric as keyof typeof b];

          return (metricB as number) - (metricA as number);
        });
        sortedData = sortedData.slice(0, 5);
      } else if (sortType === 'lowest') {
        sortedData.sort((a, b) => {
          const metricA = a[singleMetric as keyof typeof a];
          const metricB = b[singleMetric as keyof typeof b];

          return (metricA as number) - (metricB as number);
        });
        sortedData = sortedData.slice(0, 5);
      }

      return sortedData;
    };

    const filteredData = filterAndSortData().map(team => ({
      teamName: team.teamName,
      [singleMetric]: team[singleMetric as keyof typeof team],
    }));

    const series = selectedMetrics.map((metric, index) => ({
      name: metric.charAt(0) + metric.slice(1),
      color: ['violet.6', 'blue.6', 'teal.6', 'orange.6'][index % 4],
    }));

    const singleMetricSeries = [
      {
        name: singleMetric.charAt(0) + singleMetric.slice(1),
        dataKey: singleMetric,
        color: 'blue.6',
      },
    ];

    const renderFirstChart = () => {
      if (chartType === 'BarChart') {
        return (
          <BarChart
            h={400}
            data={chartData}
            dataKey="teamName"
            series={series}
            tickLine="xy"
          />
        );
      } else if (chartType === 'AreaChart') {
        return (
          <AreaChart
            h={400}
            data={chartData}
            dataKey="teamName"
            series={series}
            curveType="linear"
            tickLine="xy"
            gridAxis="xy"
          />
        );
      }
    };

    return (
      <div>
        {/* First Chart */}
        <Card withBorder ref={ref} style={{ marginBottom: '20px' }}>
          <Stack>
            <Center>
              <Title order={5}>Composed Charts</Title>
            </Center>

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
              placeholder="Select metrics to display"
              value={selectedMetrics}
              onChange={setSelectedMetrics}
              data={availableMetrics}
            />

            {renderFirstChart()}
          </Stack>
        </Card>

        {/* Second Chart */}
        <Card withBorder ref={ref} style={{ marginBottom: '16px' }}>
          <Stack>
            <Center>
              <Title order={5}>Top/Lowest/Sorted Chart</Title>
            </Center>
            
            <Select
              label="Single Metric"
              placeholder="Select a metric to display"
              value={singleMetric}
              onChange={(value: string | null) => {
                if (value) setSingleMetric(value);
              }}
              data={availableMetrics}
            />

            <Select
              label="Sorting Option"
              placeholder="Select sorting/filtering method"
              value={sortType}
              onChange={(value: string | null) => {
                if (value) setSortType(value);
              }}
              data={[
                { value: 'all', label: 'All Teams' },
                { value: 'ascending', label: 'Ascending Order' },
                { value: 'descending', label: 'Descending Order' },
                { value: 'top', label: 'Top 5 Teams' },
                { value: 'lowest', label: 'Lowest 5 Teams' },
              ]}
            />

            <BarChart
              h={400}
              data={filteredData}
              dataKey="teamName"
              series={singleMetricSeries}
              tickLine="xy"
            />
          </Stack>
        </Card>
      </div>
    );
  }
);

export default AllTeams;
