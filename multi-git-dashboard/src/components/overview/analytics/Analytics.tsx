import { Carousel } from '@mantine/carousel';
import { Card, Tabs } from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';
import classes from '@styles/team-analytics-view.module.css';
import IndividualAnalytics from './individual/IndividualAnalytics';
import ContributionBreakdown from './team/ContributionsBreakdown';
import OverallActivity from './team/OverallActivity';

export interface AnalyticsProps {
  teamData: TeamData;
  teamDatas: TeamData[];
}

const Analytics: React.FC<AnalyticsProps> = props => {
  const datas = [
    {
      key: 'Team',
      analytics: [OverallActivity, ContributionBreakdown],
    },
    {
      key: 'Individual',
      value: [IndividualAnalytics],
    },
  ];

  return (
    <Tabs
      defaultValue={datas[0].key}
      variant="outline"
      visibleFrom="sm"
      classNames={{
        root: classes.tabs,
        list: classes.tabsList,
        tab: classes.tab,
        panel: classes.card,
      }}
      mt={10}
    >
      <Tabs.List>
        {datas.map(data => (
          <Tabs.Tab key={data.key} value={data.key}>
            {data.key}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      <Card withBorder className={classes.card}>
        {datas.map(data => (
          <Tabs.Panel key={data.key} value={data.key}>
            <Carousel speed={10}>
              {data.analytics?.map(analytic => (
                <Carousel.Slide key={analytic.name}>
                  {analytic(props)}
                </Carousel.Slide>
              ))}
            </Carousel>
          </Tabs.Panel>
        ))}
      </Card>
    </Tabs>
  );
};

export default Analytics;
