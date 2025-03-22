import { BarChart } from '@mantine/charts';
import { Center } from '@mantine/core';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import { AnalyticsProps } from '../Analytics';

interface TeamIssuesTrackerProps extends AnalyticsProps {}

interface TeamIssuesTrackersData {
  milestoneTitle: string;
  'Open Issues': number;
  'Closed Issues': number;
  createdAt: Date;
}

const TeamIssuesTracker: React.FC<TeamIssuesTrackerProps> = ({
  teamData,
  selectedWeekRange,
  dateUtils,
}) => {
  const { weekToDate, getEndOfWeek } = dateUtils;

  const filterDataByWeekRange = () => {
    const startDate = weekToDate(selectedWeekRange[0]);
    const endDate = getEndOfWeek(weekToDate(selectedWeekRange[1]));

    const milestonesData: TeamIssuesTrackersData[] = [];

    teamData.milestones
      .sort((a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix())
      .forEach(milestone => {
        const milestoneDate = dayjs(milestone.created_at);
        const milestoneTitle = milestone.title;

        if (
          milestoneDate.isSameOrAfter(startDate) &&
          milestoneDate.isSameOrBefore(endDate)
        ) {
          milestonesData.push({
            milestoneTitle,
            'Open Issues': milestone.open_issues,
            'Closed Issues': milestone.closed_issues,
            createdAt: milestone.created_at, // Store the creation date
          });
        }
      });
    // console.log("milestone",milestonesData[0].createdAt);

    return milestonesData;
  };

  const data = filterDataByWeekRange();

  useEffect(() => {
    const startTime = Date.now();
    return () => {
      const endTime = Date.now();
      const timeSpent = endTime - startTime;
      console.info(`TeamIssuesTracker.tsx: ${timeSpent}ms`);
      // TODO: Log time spent
    };
  }, []);

  return data.length === 0 ? (
    <Center>No data available.</Center>
  ) : (
    <div style={{ width: '100%', paddingRight: '30px' }}>
      <BarChart
        h={400}
        w={'95%'}
        ml={20}
        mt={20}
        xAxisProps={{
          tickFormatter: (_value, index) => {
            const milestone = data[index];
            const createdAtFormatted = dayjs(milestone.createdAt).format(
              'MM-DD'
            );
            return `${milestone.milestoneTitle} (${createdAtFormatted})`;
          },
          tickLine: true,
        }}
        data={data}
        dataKey="milestoneTitle"
        withLegend
        legendProps={{ verticalAlign: 'bottom' }}
        series={[
          { name: 'Open Issues', color: 'blue' },
          { name: 'Closed Issues', color: 'green' },
        ]}
      >
        {/* <Tooltip
                    formatter={(_value, name, props) => {
                        const payload = props?.payload;
                        if (!payload) {
                            return [name, 'No data available'];
                        }

                        const createdAt = payload?.createdAt
                            ? dayjs(payload.createdAt).format('YYYY-MM-DD HH:mm')
                            : 'Unknown date';

                        return [
                            `${name}: ${_value}`,
                            `Created at: ${createdAt}`,
                        ];
                    }}
                    separator=" - "
                /> */}
      </BarChart>
    </div>
  );
};

export default TeamIssuesTracker;
