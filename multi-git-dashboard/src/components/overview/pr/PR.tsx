import { OverviewProps } from '@/components/cards/OverviewCard';
import { getTutorialHighlightColor } from '@/lib/utils';
import { Box, Card, Group } from '@mantine/core';
import dayjs from 'dayjs';
import { forwardRef, useState } from 'react';
import PRDetails from './PRDetails';
import PRList from './PRList';

export interface PRProps {
  team?: OverviewProps['team'];
  teamData: OverviewProps['teamData'];
  selectedWeekRange: [number, number];
  dateUtils: OverviewProps['dateUtils'];
  profileGetter: OverviewProps['profileGetter'];
}

const PR = forwardRef<HTMLDivElement, PRProps>(
  ({ team, teamData, selectedWeekRange, dateUtils, profileGetter }, ref) => {
    const MAX_HEIGHT = 500;

    const { weekToDate, getEndOfWeek } = dateUtils;

    const [selectedPR, setSelectedPR] = useState<number | null>(
      teamData.teamPRs[0]?.id ?? null
    );

    const getDisplayedPRs = () => {
      const startDate = weekToDate(selectedWeekRange[0]);
      const endDate = getEndOfWeek(weekToDate(selectedWeekRange[1]));

      return teamData.teamPRs.filter(pr => {
        const prDate = dayjs(pr.createdAt);
        return prDate.isAfter(startDate) && prDate.isBefore(endDate);
      });
    };

    return (
      <Card mah={MAX_HEIGHT} ref={ref} bg={getTutorialHighlightColor(9)}>
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
  }
);

export default PR;
