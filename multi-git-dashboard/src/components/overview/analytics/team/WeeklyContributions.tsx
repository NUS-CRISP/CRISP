import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AnalyticsProps } from '../Analytics';
import { Center } from '@mantine/core';

interface WeeklyContributionsProps extends Omit<AnalyticsProps, 'team'> {
  selectedWeekRange: [number, number];
}

const convertChartData = (
  data: number[][],
  selectedWeekRange: [number, number]
) => {
  const startDate = new Date(data[0][0] * 1000);
  const endDate = new Date(startDate);
  endDate.setMonth(startDate.getMonth() + 3.5);

  return data
    .filter(item => {
      const itemDate = new Date(item[0] * 1000);
      return itemDate >= startDate && itemDate <= endDate;
    })
    .filter(
      (_, index) =>
        index >= selectedWeekRange[0] && index <= selectedWeekRange[1]
    ) // Filter by selected week range
    .map(item => ({
      weekStarting: new Date(item[0] * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      additions: item[1],
      deletions: -Math.abs(item[2]), // Negative for deletions
    }));
};

const WeeklyContributions: React.FC<WeeklyContributionsProps> = ({
  teamData,
  selectedWeekRange,
}) => {
  if (
    !teamData ||
    !teamData.weeklyCommits ||
    teamData.weeklyCommits.length === 0
  )
    return <Center>No Data Available</Center>;
  const formattedData = convertChartData(
    teamData.weeklyCommits,
    selectedWeekRange
  );

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart
        data={formattedData}
        margin={{ top: 5, right: 40, left: 20, bottom: 5 }}
      >
        <defs>
          <linearGradient id="colorAdditions" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#31a147" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#31a147" stopOpacity={0.1} />
          </linearGradient>

          <linearGradient id="colorDeletions" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#df0d23" stopOpacity={0.1} />
            <stop offset="95%" stopColor="#df0d23" stopOpacity={0.8} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="weekStarting" />
        <YAxis />
        <Tooltip />
        <Legend />

        <Area
          type="monotone"
          dataKey="additions"
          stroke="#31a147"
          fillOpacity={1}
          fill="url(#colorAdditions)"
        />
        <Area
          type="monotone"
          dataKey="deletions"
          stroke="#df0d23"
          strokeDasharray="8 5"
          fillOpacity={1}
          fill="url(#colorDeletions)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default WeeklyContributions;
