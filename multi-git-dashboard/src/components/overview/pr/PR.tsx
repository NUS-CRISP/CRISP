import { OverviewProps } from '@/components/cards/OverviewCard';
import { endOfWeek, weekToDates } from '@/pages/_app';
import { Box, Card, Group } from '@mantine/core';
import dayjs from 'dayjs';
import { useState } from 'react';
import PRDetails from './PRDetails';
import PRList from './PRList';

export interface PRProps {
  team?: OverviewProps['team'];
  teamData: OverviewProps['teamData'];
  selectedWeekRange: [number, number];
  profileGetter: OverviewProps['profileGetter'];
}

const PR: React.FC<PRProps> = ({
  team,
  teamData,
  selectedWeekRange,
  profileGetter,
}) => {
  const MAX_HEIGHT = 500;

  const [selectedPR, setSelectedPR] = useState<number | null>(
    teamData.teamPRs[0]?.id ?? null
  );

  const getDisplayedPRs = () => {
    const startDate = weekToDates(selectedWeekRange[0]);
    const endDate = endOfWeek(weekToDates(selectedWeekRange[1]));

    return teamData.teamPRs.filter(pr => {
      const prDate = dayjs(pr.createdAt);
      return prDate.isAfter(startDate) && prDate.isBefore(endDate);
    });
  };

  return (
    <Card mah={MAX_HEIGHT}>
      <Group grow align="start">
        <Box
          style={{
            maxWidth: 200,
            marginRight: 15,
          }}
        >
          <PRList
            team={team}
            teamPRs={getDisplayedPRs()}
            selectedPR={selectedPR}
            onSelectPR={setSelectedPR}
            maxHeight={MAX_HEIGHT}
          />
        </Box>
        {selectedPR !== null && (
          <Box maw={700} mt={10} mr={10}>
            <PRDetails
              pr={teamData.teamPRs.find(pr => pr.id === selectedPR)}
              profileGetter={profileGetter}
            />
          </Box>
        )}
      </Group>
    </Card>
  );
};

export default PR;
