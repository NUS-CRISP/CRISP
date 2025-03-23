import { Team } from '@/components/views/Overview';
import { DateUtils, getTutorialHighlightColor } from '@/lib/utils';
import { Carousel, Embla } from '@mantine/carousel';
import { Card, Center, Stack, Title } from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';
import { forwardRef, useState } from 'react';
import IndividualAnalytics from './individual/IndividualAnalytics';
import OverallActivity from './team/OverallActivity';
import WeeklyContributions from './team/WeeklyContributions';
import TeamIssuesTracker from './team/TeamIssuesTracker';

export interface AnalyticsProps {
  team: Team;
  teamData: TeamData;
  teamDatas: TeamData[];
  selectedWeekRange: [number, number];
  dateUtils: DateUtils;
}

// TODO: Migrate Recharts -> Mantine Charts
const Analytics = forwardRef<HTMLDivElement, AnalyticsProps>(
  ({ team, teamData, teamDatas, selectedWeekRange, dateUtils }, ref) => {
    const [embla, setEmbla] = useState<Embla | null>(null);

    const charts = {
      Breakdown: OverallActivity,
      'Weekly Addition Deletion': WeeklyContributions,
      'Issues Tracker': TeamIssuesTracker,
      'Individual Activity': IndividualAnalytics,
    };

    const slides = Object.entries(charts).map(([componentName, Component]) => (
      <Carousel.Slide key={componentName}>
        <Stack>
          <Center>
            <Title order={3}>{componentName}</Title>
          </Center>
          <Component
            team={team}
            teamData={teamData}
            teamDatas={teamDatas}
            selectedWeekRange={selectedWeekRange}
            dateUtils={dateUtils}
          />
        </Stack>
      </Carousel.Slide>
    ));

    return (
      <Card withBorder ref={ref} bg={getTutorialHighlightColor(8)}>
        <Carousel
          key={teamData._id}
          getEmblaApi={setEmbla}
          nextControlProps={{
            // fix for only first carousel working
            onClick: () => embla?.reInit(),
          }}
          previousControlProps={{
            onClick: () => embla?.reInit(),
          }}
        >
          {slides}
        </Carousel>
      </Card>
    );
  }
);

export default Analytics;
