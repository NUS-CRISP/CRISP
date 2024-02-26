import { Stack } from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';
import Analytics from './analytics/Analytics';
import PR from './pr/PR';

export interface OverviewProps {
  teamData: TeamData;
  teamDatas: TeamData[];
}

export const OverviewCard: React.FC<OverviewProps> = ({
  teamData,
  teamDatas,
}) => {
  return (
    <Stack>
      <Analytics teamData={teamData} teamDatas={teamDatas} />
      <PR teamData={teamData} />
    </Stack>
  );
};

export default OverviewCard;
