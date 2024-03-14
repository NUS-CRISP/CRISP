import { Stack } from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';
import Analytics from '../overview/analytics/Analytics';
import PR from '../overview/pr/PR';
import { ProfileGetter, Team } from '../views/Overview';

export interface OverviewProps {
  team: Team;
  teamData: TeamData;
  teamDatas: TeamData[];
  profileGetter: ProfileGetter;
}

export const OverviewCard: React.FC<OverviewProps> = ({
  team,
  teamData,
  teamDatas,
  profileGetter
}) => {
  return (
    <Stack>
      <Analytics team={team} teamData={teamData} teamDatas={teamDatas} />
      <PR team={team} teamData={teamData} profileGetter={profileGetter} />
    </Stack>
  );
};

export default OverviewCard;
