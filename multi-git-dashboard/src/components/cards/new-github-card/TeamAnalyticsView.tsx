import { Card, Tabs } from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';
import classes from '@styles/team-analytics-view.module.css';
import IndividualCharts from './IndividualCharts';
import TeamCharts from './TeamCharts';

export interface TeamAnalyticsViewProps {
  teamData: TeamData;
  cohortAverages: {
    commits: number;
    issues: number;
    pullRequests: number;
  };
}

const TeamAnalyticsView: React.FC<TeamAnalyticsViewProps> = props => {
  const datas = [
    {
      key: 'Team',
      value: TeamCharts,
    },
    {
      key: 'Individual',
      value: IndividualCharts,
    },
  ];

  const tabs = datas.map(data => (
    <Tabs.Tab value={data.key}>{data.key}</Tabs.Tab>
  ));

  const contents = datas.map(data => (
    <Tabs.Panel value={data.key}>{data.value(props)}</Tabs.Panel>
  ));

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
      <Tabs.List>{tabs}</Tabs.List>
      <Card withBorder className={classes.card}>
        {contents}
      </Card>
    </Tabs>
  );
};

export default TeamAnalyticsView;
