import { DateUtils } from '@/lib/utils';
import { Accordion, Center, ScrollArea } from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';
import PRAccordionItem from '../pr-overview/PRAccordionItem';
import { ProfileGetter, Team } from './Overview';

export interface TeamPRListProps {
  teamData: TeamData;
  team: Team | undefined;
  dateUtils: DateUtils;
  getStudentNameByGitHandle: ProfileGetter;
}

/**
 * PR list for a single team only. Used on the Team Detail PR Overview tab.
 */
const TeamPRList: React.FC<TeamPRListProps> = ({
  teamData,
  team,
  dateUtils,
  getStudentNameByGitHandle,
}) => {
  if (!team) {
    return (
      <Center py="xl">
        No team linked to this repo. Link a team in the course Teams page.
      </Center>
    );
  }

  return (
    <ScrollArea.Autosize mah="70vh">
      <Accordion
        defaultValue={[teamData._id]}
        multiple
        variant="separated"
      >
        <PRAccordionItem
          index={0}
          teamData={teamData}
          team={team}
          teamDatas={[teamData]}
          dateUtils={dateUtils}
          getStudentNameByGitHandle={getStudentNameByGitHandle}
        />
      </Accordion>
    </ScrollArea.Autosize>
  );
};

export default TeamPRList;
