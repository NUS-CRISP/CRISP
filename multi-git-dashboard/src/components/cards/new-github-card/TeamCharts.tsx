// components/TeamCharts.tsx
import { TeamData } from '@shared/types/TeamData';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface TeamChartsProps {
  teamData: TeamData;
}

const TeamCharts: React.FC<TeamChartsProps> = ({ teamData }) => {
  const data = [
    { name: 'Commits', value: teamData.commits },
    { name: 'Issues', value: teamData.issues },
    { name: 'Pull Requests', value: teamData.pullRequests },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie dataKey="value" data={data} fill="#8884d8" label>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default TeamCharts;
