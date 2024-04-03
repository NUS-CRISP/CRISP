import { DateUtils, getTutorialHighlightColor } from '@/lib/utils';
import { Accordion, Center } from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';
import { forwardRef } from 'react';
import OverviewCard from '../cards/OverviewCard';
import { ProfileGetter, Team } from '../views/Overview';

interface OverviewAccordionItemProps {
  teamData: TeamData;
  team: Team | undefined;
  teamDatas: TeamData[];
  dateUtils: DateUtils;
  getStudentNameByGitHandle: ProfileGetter;
}

const OverviewAccordionItem = forwardRef<
  HTMLDivElement,
  OverviewAccordionItemProps
>(
  (
    { teamData, team, teamDatas, dateUtils, getStudentNameByGitHandle },
    ref
  ) => (
    <Accordion.Item key={teamData._id} value={teamData._id} ref={ref}>
      <Accordion.Control bg={getTutorialHighlightColor(7)}>
        {teamData.repoName}
      </Accordion.Control>
      <Accordion.Panel bg={getTutorialHighlightColor(7)}>
        {team ? (
          <OverviewCard
            team={team}
            teamData={teamData}
            teamDatas={teamDatas}
            dateUtils={dateUtils}
            profileGetter={getStudentNameByGitHandle}
          />
        ) : (
          <Center>No team found.</Center>
        )}
      </Accordion.Panel>
    </Accordion.Item>
  )
);

export default OverviewAccordionItem;
