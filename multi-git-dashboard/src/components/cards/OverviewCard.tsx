import { DateUtils } from '@/lib/utils';
import { RangeSlider, Stack } from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';
import { useState } from 'react';
import Analytics from '../overview/analytics/Analytics';
import PR from '../overview/pr/PR';
import TutorialPopover from '../tutorial/TutorialPopover';
import { ProfileGetter, Team } from '../views/Overview';

export interface OverviewProps {
  index: number;
  team: Team;
  teamData: TeamData;
  teamDatas: TeamData[];
  dateUtils: DateUtils;
  profileGetter: ProfileGetter;
}

export const OverviewCard: React.FC<OverviewProps> = ({
  index,
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
      <TutorialPopover stage={10} offset={30} disabled={index !== 0}>
        <RangeSlider
          value={selectedWeekRange}
          max={12}
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
      </TutorialPopover>
      <TutorialPopover stage={8} position="left" disabled={index !== 0}>
        <Analytics
          team={team}
          teamData={teamData}
          teamDatas={teamDatas}
          selectedWeekRange={selectedWeekRange}
          dateUtils={dateUtils}
        />
      </TutorialPopover>
      <TutorialPopover stage={9} position="top" disabled={index !== 0}>
        <PR
          team={team}
          teamData={teamData}
          selectedWeekRange={selectedWeekRange}
          dateUtils={dateUtils}
          profileGetter={profileGetter}
        />
      </TutorialPopover>
    </Stack>
  );
};

export default OverviewCard;
