import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { AnalyticsProps } from '../Analytics';

interface ContributionBreakdownProps extends AnalyticsProps {}

const ContributionBreakdown: React.FC<ContributionBreakdownProps> = ({
  teamData,
}) => {
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
  const data = Object.entries(teamData.teamContributions).map(
    ([key, value]) => ({
      name: key,
      value: value.commits + value.pullRequests,
    })
  );

  return (
    <>
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            dataKey="value"
            isAnimationActive={false}
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            label
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </>
  );
};

export default ContributionBreakdown;
