import { Box, Card, Group, RangeSlider, Stack } from '@mantine/core';
import dayjs from 'dayjs';
import { useState } from 'react';
import { OverviewProps } from '../../cards/OverviewCard';
import PRDetails from './PRDetails';
import PRList from './PRList';

export interface PRProps {
  team?: OverviewProps['team'];
  teamData: OverviewProps['teamData'];
  profileGetter: OverviewProps['profileGetter'];
}

const PR: React.FC<PRProps> = ({ team, teamData, profileGetter }) => {
  const MAX_HEIGHT = 500;
  const START_DATE = dayjs('2024-01-15');
  const BREAK_START_WEEK = 6;
  const BREAK_DURATION_WEEKS = 1;

  const [selectedPR, setSelectedPR] = useState<number | null>(
    teamData.teamPRs[0]?.id || null
  );

  const calculateCurrentWeek = () => {
    const currentWeek = dayjs().diff(START_DATE, 'week');
    return currentWeek >= BREAK_START_WEEK ? currentWeek + BREAK_DURATION_WEEKS : currentWeek;
  };
  const totalWeeks = calculateCurrentWeek();

  const [selectedWeekRange, setSelectedWeekRange] = useState<[number, number]>([0, totalWeeks]);

  const weekToDates = (week: number) => {
    let startDate = START_DATE.add(week, 'week');
    if (week >= BREAK_START_WEEK) {
      startDate = startDate.add(BREAK_DURATION_WEEKS, 'week');
    }
    return startDate;
  };

  const getDisplayedPRs = () => {
    const startDate = weekToDates(selectedWeekRange[0]);
    const endDate = weekToDates(selectedWeekRange[1]).add(1, 'week');

    return teamData.teamPRs.filter(pr => {
      const prDate = dayjs(pr.createdAt);
      return prDate.isAfter(startDate) && prDate.isBefore(endDate);
    });
  };

  return (
    <Card mah={MAX_HEIGHT}>
      <Stack>
        <Group grow align='start'>
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
        <RangeSlider
          value={selectedWeekRange}
          max={totalWeeks}
          minRange={1}
          onChange={setSelectedWeekRange}
          label={(value) => `Week ${value + 1}`}
          marks={Array.from({ length: totalWeeks + 1 }, (_, i) => ({
            value: i,
            label: `Week ${i + 1}`
          }))}
          mx={20}
          my={15}
        />
      </Stack>
    </Card>
  );
};

export default PR;
