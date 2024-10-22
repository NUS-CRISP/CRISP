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
        // weeklyCommits: teamData.weeklyCommits.length,
      }));

    const availableMetrics = [
      { value: 'commits', label: 'Commits' },
      { value: 'issues', label: 'Issues' },
      { value: 'pullRequests', label: 'Pull Requests' },
      // { value: 'weeklyCommits', label: 'Weekly Commits' },
    ];

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
      }

      return sortedData;
    };

    // Use filtered data after sorting
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
        {/* First Chart with Sorting */}
        <Card withBorder ref={ref} style={{ marginTop:'10px', marginBottom: '10px' }}>
          <Stack>
            {/* <Center>
              <Title order={5}>Composed Charts with Sorting</Title>
            </Center> */}

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

            {renderChart()}
          </Stack>
        </Card>
      </div>
    );
  }
);

export default AllTeams;
