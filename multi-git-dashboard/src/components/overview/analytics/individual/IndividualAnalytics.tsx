import { weekToDates } from '@/components/cards/OverviewCard';
import { BarChart } from '@mantine/charts';
import { Center } from '@mantine/core';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { useEffect } from 'react';
import { AnalyticsProps } from '../Analytics';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

interface IndividualAnalyticsProps extends AnalyticsProps { }

interface IndividualAnalyticsData {
  name: string;
  gitHandle: string;
  'Pull Requests': number;
  'Code Reviews': number;
  Comments: number;
}

const IndividualAnalytics: React.FC<IndividualAnalyticsProps> = ({
  team,
  teamData,
  selectedWeekRange,
}) => {
  const gitHandleToNameMap = new Map(
    team.members.map(member => [
      member.gitHandle,
      member.name || member.gitHandle,
    ])
  );

  const filterDataByWeekRange = () => {
    const startDate = weekToDates(selectedWeekRange[0]);
    const endDate = weekToDates(selectedWeekRange[1]).add(1, 'week');

    const contributors = new Map<string, IndividualAnalyticsData>();

    teamData.teamPRs.forEach(pr => {
      const prDate = dayjs(pr.createdAt);
      const prUser = pr.user || 'Unknown';
      const prName = gitHandleToNameMap.get(prUser) || prUser;

      if (prDate.isSameOrAfter(startDate) && prDate.isSameOrBefore(endDate)) {
        const currentData = contributors.get(prUser) || {
          name: prName,
          gitHandle: prUser,
          'Pull Requests': 0,
          'Code Reviews': 0,
          Comments: 0,
        };
        currentData['Pull Requests'] += 1;
        contributors.set(prUser, currentData);
      }

      pr.reviews.forEach(review => {
        const reviewDate = dayjs(review.submittedAt);
        if (
          reviewDate.isSameOrAfter(startDate) &&
          reviewDate.isSameOrBefore(endDate)
        ) {
          const reviewUser = review.user || 'Unknown';
          const reviewName = gitHandleToNameMap.get(reviewUser) || reviewUser;
          const reviewData = contributors.get(reviewUser) || {
            name: reviewName,
            gitHandle: reviewUser,
            'Pull Requests': 0,
            'Code Reviews': 0,
            Comments: 0,
          };
          reviewData['Code Reviews'] += 1;

          review.comments.forEach(() => {
            reviewData['Comments'] += 1;
          });

          contributors.set(reviewUser, reviewData);
        }
      });
    });

    return Array.from(contributors.values());
  };

  let data = filterDataByWeekRange();

  // filter only if gitHandle is populated
  if (team.members.every(member => member.gitHandle !== '')) {
    data = data.filter(d =>
      team.members.some(member => member.gitHandle === d.gitHandle)
    );
  }

  // Log time spent on this component
  useEffect(() => {
    // Capture start time
    const startTime = Date.now();

    // Cleanup function to calculate and log the time spent
    return () => {
      const endTime = Date.now();
      const timeSpent = endTime - startTime;
      console.log(`Time spent on IndividualAnalytics: ${timeSpent}ms`);
      // TODO: Log time spent
    };
  }, []);

  return data.every(
    d =>
      d['Pull Requests'] === 0 && d['Code Reviews'] === 0 && d['Comments'] === 0
  ) ? (
    <Center>No data available.</Center>
  ) : (
    <BarChart
      h={400}
      w={750}
      ml={20}
      mt={20}
      xAxisProps={{ tickFormatter: (_value, index) => data[index].gitHandle }}
      data={data}
      dataKey="name"
      withLegend
      legendProps={{ verticalAlign: 'bottom' }}
      tooltipAnimationDuration={200}
      series={[
        { name: 'Pull Requests', color: 'red' },
        { name: 'Code Reviews', color: 'green' },
        { name: 'Comments', color: 'blue' },
      ]}
    />
  );
};

export default IndividualAnalytics;
