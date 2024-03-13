import { BarChart } from '@mantine/charts';
import { Box, Button, Center, Stack } from '@mantine/core';
import { useState } from 'react';
import { AnalyticsProps } from '../Analytics';

interface IndividualAnalyticsProps extends AnalyticsProps { }

// TODO: Handle filter by last week on backend
const IndividualAnalytics: React.FC<IndividualAnalyticsProps> = ({
  team,
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
          currentData.codeReviews += 1;

          review.comments.forEach(() => currentData.comments += 1);

          contributors.set(reviewUser, currentData);
        }
      });
    });

    return Array.from(contributors, ([gitHandle, data]) => ({
      name: team.members.find(member => member.gitHandle === gitHandle)?.name || gitHandle,
      gitHandle,
      'Pull Requests': data.pullRequests,
      'Code Reviews': data.codeReviews,
      'Comments': data.comments,
    }));
  };

  let data = showLastWeek
    ? filterLastWeekData()
    : Object.entries(teamData.teamContributions).map(([gitHandle, teamContribution]) => ({
      name: team.members.find(member => member.gitHandle === gitHandle)?.name || gitHandle,
      gitHandle: gitHandle,
      'Pull Requests': teamContribution.pullRequests,
      'Code Reviews': teamContribution.codeReviews,
      'Comments': teamContribution.comments,
    }));

  // filter only if gitHandle is populated
  if (team.members.every(member => member.gitHandle !== '')) {
    data = data.filter(d => team.members.some(member => member.gitHandle === d.gitHandle));
  }

  return (
    <Stack>
      <Box style={{ marginLeft: 'auto' }}>
        <Button onClick={() => setShowLastWeek(!showLastWeek)}>
          {showLastWeek ? 'Show All Time' : 'Show Last Week'}
        </Button>
      </Box>
      {
        (data.every(d => d['Pull Requests'] === 0 && d['Code Reviews'] === 0 && d['Comments'] === 0)) ? <Center>No data available.</Center> : (
          <BarChart
            h={400}
            w={750}
            ml={20}
            mt={20}
            xAxisProps={{ tickFormatter: (value: string) => value.length >= 12 ? `${value.substring(0, 12)}...` : value }}
            data={data}
            dataKey='name'
            withLegend
            legendProps={{ verticalAlign: 'bottom' }}
            tooltipAnimationDuration={200}
            series={[
              { name: 'Pull Requests', color: 'red' },
              { name: 'Code Reviews', color: 'green' },
              { name: 'Comments', color: 'blue' },
            ]}
          />)
      }
    </Stack>
  );
};

export default IndividualAnalytics;
