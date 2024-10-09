import { useState, forwardRef } from 'react';
import { Card, Stack, Title, Center, Select, MultiSelect } from '@mantine/core';
import { BarChart } from '@mantine/charts';
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

    // Prepare unique teams and data
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
      
    // const data = [
    //   { teamName: 'January', commits: 30, issues: 30, pullRequests: 30, weeklyCommits: 30 },
    // ];

    const availableMetrics = [
      { value: 'commits', label: 'Commits' },
      { value: 'issues', label: 'Issues' },
      { value: 'pullRequests', label: 'Pull Requests' },
      { value: 'weeklyCommits', label: 'Weekly Commits' },
    ];

    console.log("Available Metrics:", availableMetrics); // Debugging the available metrics

    // Convert data for Mantine BarChart
    const chartData = data.map((team) => ({
      teamName: team.teamName,
      ...selectedMetrics.reduce(
        (acc, metric) => ({ ...acc, [metric]: team[metric as keyof typeof team] }),
        {}
      ),
    }));

    console.log('Chart Data:', chartData); // Debugging the data format

    const series = selectedMetrics.map((metric, index) => ({
      name: metric.charAt(0) + metric.slice(1),
      color: ['violet.6', 'blue.6', 'teal.6', 'orange.6'][index % 4],
    }));

    console.log('Series:', series); // Debugging the series format

    return (
      <Card withBorder ref={ref} style={{ marginBottom: '16px' }}>
        <Stack>
          <Center>
            <Title order={3}>Customize Your Chart</Title>
          </Center>

          {/* Chart Type Selection */}
          <Select
            label="Chart Type"
            placeholder="Select chart type"
            value={chartType}
            onChange={(value: string | null) => {
              if (value) setChartType(value);
            }}
            data={[{ value: 'BarChart', label: 'Bar Chart' }]} // You can add more chart types later
          />

          {/* Metric Selection */}
          <MultiSelect
            label="Metrics"
            placeholder="Select metrics to display"
            value={selectedMetrics}
            onChange={setSelectedMetrics}
            data={availableMetrics}
          />

          {/* Render Bar Chart */}
          <BarChart
            h={400}
            data={chartData}
            dataKey="teamName" // x-axis key
            series={series} // Ensure series is correctly mapping to data keys
            tickLine="none"
          />
        </Stack>
      </Card>
    );
  }
);

export default AllTeams;
