import { DateUtils } from '@/lib/utils';
import { RangeSlider, Stack } from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';
import { useState } from 'react';
import Analytics from '../overview/analytics/Analytics';
import PR from '../overview/pr/PR';
import { ProfileGetter, Team } from '../views/Overview';

export interface OverviewProps {
  team: Team;
  teamData: TeamData;
  teamDatas: TeamData[];
  dateUtils: DateUtils;
  profileGetter: ProfileGetter;
}

export const OverviewCard: React.FC<OverviewProps> = ({
  team,
  teamData,
  teamDatas,
  dateUtils,
  profileGetter,
}) => {
  const { getCurrentWeek } = dateUtils;
  const totalWeeks = getCurrentWeek();

  const [selectedWeekRange, setSelectedWeekRange] = useState<[number, number]>([
    0,
    totalWeeks - 1,
  ]);

  return (
    <Stack>
      <RangeSlider
        value={selectedWeekRange}
        max={totalWeeks - 1}
        minRange={1}
        onChange={setSelectedWeekRange}
        label={value => `Week ${value + 1}`}
        marks={Array.from({ length: totalWeeks }, (_, i) => ({
          value: i,
          label: `Week ${i + 1}`,
        }))}
        mx={20}
        mb={20}
      />
      <Analytics
        team={team}
        teamData={teamData}
        teamDatas={teamDatas}
        selectedWeekRange={selectedWeekRange}
        dateUtils={dateUtils}
      />
      <PR
        team={team}
        teamData={teamData}
        selectedWeekRange={selectedWeekRange}
        dateUtils={dateUtils}
        profileGetter={profileGetter}
      />
    </Stack>
  );
};

export default OverviewCard;
