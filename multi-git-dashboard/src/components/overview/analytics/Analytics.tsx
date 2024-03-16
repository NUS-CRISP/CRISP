import { Team } from '@/components/views/Overview';
import { Carousel, Embla } from '@mantine/carousel';
import { Card, Center, Stack, Title } from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';
import { useState } from 'react';
import IndividualAnalytics from './individual/IndividualAnalytics';
import OverallActivity from './team/OverallActivity';
import WeeklyContributions from './team/WeeklyContributions';

export interface AnalyticsProps {
  team: Team;
  teamData: TeamData;
  teamDatas: TeamData[];
  selectedWeekRange: [number, number];
}

// TODO: Migrate Recharts -> Mantine Charts
const Analytics: React.FC<AnalyticsProps> = ({
  team,
  teamData,
  teamDatas,
  selectedWeekRange,
}) => {
  const [embla, setEmbla] = useState<Embla | null>(null);

  const charts = {
    Breakdown: OverallActivity,
    'Weekly Activity': WeeklyContributions,
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
        />
      </Stack>
    </Carousel.Slide>
  ));

  return (
    <Card withBorder>
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
};

export default Analytics;
