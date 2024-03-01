import { Button, Stack } from '@mantine/core';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AnalyticsProps } from '../Analytics';

interface IndividualAnalyticsProps extends AnalyticsProps { }

// TODO: Handle filter by last week on backend
const IndividualAnalytics: React.FC<IndividualAnalyticsProps> = ({
  teamData,
}) => {
  const [showLastWeek, setShowLastWeek] = useState(false);

  const filterLastWeekData = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const contributors = new Map<
      string,
      { pullRequests: number; codeReviews: number; comments: number }
    >();

    teamData.teamPRs.forEach(pr => {
      const prDate = new Date(pr.createdAt);
      const prUser = pr.user || 'Unknown';

      if (prDate >= oneWeekAgo) {
        const currentData = contributors.get(prUser) || {
          pullRequests: 0,
          codeReviews: 0,
          comments: 0,
        };
        currentData.pullRequests += 1; // Increment PR count

        contributors.set(prUser, currentData);
      }

      pr.reviews.forEach(review => {
        const reviewDate = new Date(review.submittedAt || '');
        if (reviewDate >= oneWeekAgo) {
          const reviewUser = review.user || 'Unknown';
          const currentData = contributors.get(reviewUser) || {
            pullRequests: 0,
            codeReviews: 0,
            comments: 0,
          };
          currentData.codeReviews += 1; // Increment review count

          review.comments.forEach(() => {
            currentData.comments += 1; // Increment comment count
          });

          contributors.set(reviewUser, currentData);
        }
      });
    });

    return Array.from(contributors, ([name, data]) => ({ name, ...data }));
  };

  const data = showLastWeek
    ? filterLastWeekData()
    : Object.entries(teamData.teamContributions).map(([key, value]) => ({
      name: key,
      commits: value.commits,
      pullRequests: value.pullRequests,
      codeReviews: value.codeReviews,
      comments: value.comments,
    }));

  return (
    <Stack align='flex-end'>
      <Button onClick={() => setShowLastWeek(!showLastWeek)}>
        {showLastWeek ? 'Show All Time' : 'Show Last Week'}
      </Button>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ right: 50, left: 20 }}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="pullRequests" fill="#8884d8" name="Pull Requests" />
          <Bar dataKey="codeReviews" fill="#82ca9d" name="Code Reviews" />
          <Bar dataKey="comments" fill="#ffc658" name="Comments" />
        </BarChart>
      </ResponsiveContainer>
    </Stack>
  );
};

export default IndividualAnalytics;
