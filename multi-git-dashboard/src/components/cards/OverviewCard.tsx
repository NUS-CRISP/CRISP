import { Stack } from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';
import Analytics from '../overview/analytics/Analytics';
import PR from '../overview/pr/PR';
import { Team } from '../views/Overview';

export interface OverviewProps {
  team?: Team;
  teamData: TeamData;
  teamDatas: TeamData[];
}

export const OverviewCard: React.FC<OverviewProps> = ({
  team,
  teamData,
  teamDatas,
}) => {
  return (
    <Stack>
      <Analytics teamData={teamData} teamDatas={teamDatas} />
      <PR team={team} teamData={teamData} />
    </Stack>
  );
};

export default OverviewCard;
