import { Carousel, Embla } from '@mantine/carousel';
import { Card, rem } from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';
import classes from '@styles/team-analytics-view.module.css';
import { IconArrowLeft, IconArrowRight } from '@tabler/icons-react';
import { useState } from 'react';
import IndividualAnalytics from './individual/IndividualAnalytics';
import OverallActivity from './team/OverallActivity';
import WeeklyContributions from './team/WeeklyContributions';

export interface AnalyticsProps {
  teamData: TeamData;
  teamDatas: TeamData[];
}

const Analytics: React.FC<AnalyticsProps> = ({ teamData, teamDatas }) => {
  const [embla, setEmbla] = useState<Embla | null>(null);

  return (
    <Card withBorder className={classes.card}>
      <Carousel
        key={teamData._id}
        getEmblaApi={setEmbla}
        nextControlIcon={
          <IconArrowRight
            style={{ width: rem(16), height: rem(16) }}
            onClick={() => embla?.reInit()}
          />
        }
        previousControlIcon={
          <IconArrowLeft
            style={{ width: rem(16), height: rem(16) }}
            onClick={() => embla?.reInit()}
          />
        }
      >
        <Carousel.Slide>
          <OverallActivity teamData={teamData} teamDatas={teamDatas} />
        </Carousel.Slide>
        <Carousel.Slide>
          <WeeklyContributions teamData={teamData} teamDatas={teamDatas} />
        </Carousel.Slide>
        <Carousel.Slide>
          <IndividualAnalytics teamData={teamData} teamDatas={teamDatas} />
        </Carousel.Slide>
      </Carousel>
    </Card>
  );
};

export default Analytics;
