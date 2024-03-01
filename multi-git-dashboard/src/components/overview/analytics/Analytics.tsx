import { Carousel, Embla } from '@mantine/carousel';
import { Card } from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';
import { useEffect, useState } from 'react';
import IndividualAnalytics from './individual/IndividualAnalytics';
import OverallActivity from './team/OverallActivity';
import WeeklyContributions from './team/WeeklyContributions';

export interface AnalyticsProps {
  teamData: TeamData;
  teamDatas: TeamData[];
}

const Analytics: React.FC<AnalyticsProps> = ({ teamData, teamDatas }) => {
  const [embla, setEmbla] = useState<Embla | null>(null);

  const slides = [
    OverallActivity, WeeklyContributions, IndividualAnalytics
  ].map((Component) => (
    <Carousel.Slide key={Component.name}>
      <Component teamData={teamData} teamDatas={teamDatas} />
    </Carousel.Slide>
  ));

  useEffect(() => {
    embla?.reInit();
  }, []);

  return (
    <Card withBorder>
      <Carousel
        key={teamData._id}
        getEmblaApi={setEmbla}
        nextControlProps={{
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
