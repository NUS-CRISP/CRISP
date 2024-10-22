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

interface WeeklyContributionsProps extends Omit<AnalyticsProps, 'team'> {}

const convertChartData = (data: number[][]) => {
  const startDate = new Date(data[0][0] * 1000);
  const endDate = new Date(startDate);
  endDate.setMonth(startDate.getMonth() + 3.5);

  return data
    .filter(item => {
      const itemDate = new Date(item[0] * 1000);
      return itemDate >= startDate && itemDate <= endDate;
    })
    .map(item => ({
      weekStarting: new Date(item[0] * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      additions: item[1],
      deletions: Math.abs(item[2]),
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
        <Line type="monotone" dataKey="additions" stroke="#00cc00" />
        <Line type="monotone" dataKey="deletions" stroke="#ff5c33" />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default WeeklyContributions;