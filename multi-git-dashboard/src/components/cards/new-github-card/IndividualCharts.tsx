import { TeamData } from '@shared/types/TeamData';
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const IndividualCharts: React.FC<{ teamData: TeamData }> = ({ teamData }) => {
  const data = Object.entries(teamData.teamContributions).map(
    ([key, value]) => ({
      name: key,
      commits: value.commits,
      pullRequests: value.pullRequests,
      codeReviews: value.codeReviews,
      comments: value.comments,
    })
  );

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="commits" fill="#8884d8" name="Commits" />
        <Bar dataKey="pullRequests" fill="#82ca9d" name="Pull Requests" />
        <Bar dataKey="codeReviews" fill="#ffc658" name="Code Reviews" />
        <Bar dataKey="comments" fill="#ff8042" name="Comments" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default IndividualCharts;
