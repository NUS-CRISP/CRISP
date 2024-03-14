import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AnalyticsProps } from '../Analytics';

interface WeeklyContributionsProps extends Omit<AnalyticsProps, 'team'> { }

const convertChartData = (data: number[][]) => {
  return data.map(item => ({
    weekStarting: new Date(item[0] * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    additions: item[1],
    deletions: Math.abs(item[2]), // Convert deletions to positive numbers for visualization
  }));
};

const WeeklyContributions: React.FC<WeeklyContributionsProps> = ({
  teamData,
}) => {
  const formattedData = convertChartData(teamData.weeklyCommits);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={formattedData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="weekStarting" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="additions" stroke="#8884d8" />
        <Line type="monotone" dataKey="deletions" stroke="#82ca9d" />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default WeeklyContributions;
