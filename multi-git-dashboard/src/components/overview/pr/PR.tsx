import { Box } from '@mantine/core';
import { useState } from 'react';
import { OverviewProps } from '../OverviewCard';
import PRDetails from './PRDetails';
import PRList from './PRList';

interface PRProps {
  teamData: OverviewProps['teamData'];
}

const PR: React.FC<PRProps> = ({ teamData }: PRProps) => {
  const [selectedPR, setSelectedPR] = useState<number | null>(
    teamData.teamPRs[0]?.id || null
  );

  return (
    <Box
      // TODO: Refactor to CSS module
      style={{
        display: 'flex',
        border: '1px solid var(--mantine-color-default-border)',
        borderRadius: 'var(--mantine-radius-sm)',
        padding: 20,
      }}
    >
      <Box maw={200} mr={15}>
        <PRList
          teamPRs={teamData.teamPRs}
          selectedPR={selectedPR}
          onSelectPR={setSelectedPR}
        />
      </Box>
      {selectedPR !== null && (
        <div style={{ flexGrow: 1, maxWidth: 750 }}>
          <PRDetails pr={teamData.teamPRs.find(pr => pr.id === selectedPR)} />
        </div>
      )}
    </Box>
  );
};

export default PR;
