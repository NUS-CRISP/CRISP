import { DateUtils, getTutorialHighlightColor } from '@/lib/utils';
import { Accordion, Center } from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';
import { forwardRef } from 'react';
import OverviewCard from '../cards/OverviewCard';
import { ProfileGetter, Team } from '../views/TeamReview';

interface OverviewAccordionItemProps {
  index: number;
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
    { index, teamData, team, teamDatas, dateUtils, getStudentNameByGitHandle },
    ref
  ) => {
    return (
      <Accordion.Item key={teamData._id} value={teamData._id} ref={ref}>
        <Accordion.Control bg={getTutorialHighlightColor(7)}>
          {teamData.repoName}
        </Accordion.Control>
        <Accordion.Panel bg={getTutorialHighlightColor(7)}>
          {team ? (
            <OverviewCard
              index={index}
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
    );
  }
);

export default OverviewAccordionItem;
