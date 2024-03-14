import { RangeSlider, Stack } from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';
import dayjs from 'dayjs';
import { useState } from 'react';
import Analytics from '../overview/analytics/Analytics';
import PR from '../overview/pr/PR';
import { ProfileGetter, Team } from '../views/Overview';

export interface OverviewProps {
  team: Team;
  teamData: TeamData;
  teamDatas: TeamData[];
  profileGetter: ProfileGetter;
}

export const START_DATE = dayjs('2024-01-15');
export const BREAK_START_WEEK = 6;
export const BREAK_DURATION_WEEKS = 1;
export const weekToDates = (week: number) => {
  let startDate = START_DATE.add(week, 'week');
  if (week >= BREAK_START_WEEK) {
    startDate = startDate.add(BREAK_DURATION_WEEKS, 'week');
  }
  return startDate;
};

export const OverviewCard: React.FC<OverviewProps> = ({
  team,
  teamData,
  teamDatas,
  profileGetter
}) => {
  const calculateCurrentWeek = () => {
    const currentWeek = dayjs().diff(START_DATE, 'week');
    return currentWeek >= BREAK_START_WEEK ? currentWeek + BREAK_DURATION_WEEKS : currentWeek;
  };
  const totalWeeks = calculateCurrentWeek();

  const [selectedWeekRange, setSelectedWeekRange] = useState<[number, number]>([0, totalWeeks]);

  return (
    <Stack>
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
        mb={20}
      />
      <Analytics team={team} teamData={teamData} teamDatas={teamDatas} selectedWeekRange={selectedWeekRange} />
      <PR team={team} teamData={teamData} selectedWeekRange={selectedWeekRange} profileGetter={profileGetter} />
    </Stack>
  );
};

export default OverviewCard;
