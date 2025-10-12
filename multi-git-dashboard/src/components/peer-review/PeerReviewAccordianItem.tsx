import { DateUtils, getTutorialHighlightColor } from '@/lib/utils';
import { Accordion, Center } from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';
import { forwardRef } from 'react';
import PeerReviewTeamCard from '../cards/PeerReviewTeamCard';
import { ProfileGetter, Team } from '../views/Overview';

interface OverviewAccordionItemProps {
  teamData: TeamData;
  team: Team | undefined;
}

const PeerReviewAccordionItem = forwardRef<
  HTMLDivElement,
  OverviewAccordionItemProps
>(({ teamData, team }, ref) => {
  return (
    <Accordion.Item key={teamData._id} value={teamData._id} ref={ref}>
      <Accordion.Control>{teamData.repoName}</Accordion.Control>
      <Accordion.Panel>
        {team ? (
          <PeerReviewTeamCard
            members={team.members}
            TA={team.TA}
            onUpdate={() => {}}
          />
        ) : (
          <Center>No team found.</Center>
        )}
      </Accordion.Panel>
    </Accordion.Item>
  );
});

export default PeerReviewAccordionItem;
