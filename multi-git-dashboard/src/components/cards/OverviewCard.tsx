import { DateUtils } from '@/lib/utils';
import { RangeSlider, Stack } from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';
import { User } from '@shared/types/User';
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
  user: User;
}

export const OverviewCard: React.FC<OverviewProps> = ({
  index,
  team,
  teamData,
  teamDatas,
  dateUtils,
  profileGetter,
  user,
}) => {
  const { getCurrentWeek } = dateUtils;
  const totalWeeks = getCurrentWeek();

  const [selectedWeekRange, setSelectedWeekRange] = useState<[number, number]>([
    0,
    totalWeeks - 1,
  ]);

  const marks = Array.from({ length: 15 }, (_, i) => {
    if (i === 6) {
      return {
        value: i,
        label: <span style={{ whiteSpace: 'pre' }}>{'Recess\nWeek'}</span>,
      }; // Recess Week with a line break
    }
    if (i === 14) {
      return {
        value: i,
        label: <span style={{ whiteSpace: 'pre' }}>{'Reading\nWeek'}</span>,
      }; // Recess Week with a line break
    }
    if (i > 6) {
      return { value: i, label: `W${i}` }; // Weeks after "Recess Week" are numbered from 7 to 13
    }
    return { value: i, label: `W${i + 1}` }; // Weeks before the "Recess Week"
  });

  return (
    <Stack>
      <TutorialPopover stage={10} offset={30} disabled={index !== 0}>
        <RangeSlider
          value={selectedWeekRange}
          max={14}
          minRange={1}
          onChange={setSelectedWeekRange}
          label={value =>
            value === 6
              ? 'Recess Week'
              : `Week ${value < 6 ? value + 1 : value}`
          }
          marks={marks}
          mx={20}
          mb={30}
        />
      </TutorialPopover>
      <TutorialPopover stage={8} position="left" disabled={index !== 0}>
        <Analytics
          team={team}
          teamData={teamData}
          teamDatas={teamDatas}
          selectedWeekRange={selectedWeekRange}
          dateUtils={dateUtils}
          user={user}
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
