import { Box } from '@mantine/core';
import { useState } from 'react';
import { OverviewProps } from '../OverviewCard';
import PRDetails from './PRDetails';
import PRList from './PRList';

interface PRProps {
  teamData: OverviewProps['teamData'];
}

const PR: React.FC<PRProps> = ({ teamData }: PRProps) => {
  const MAX_HEIGHT = 500;

  const [selectedPR, setSelectedPR] = useState<number | null>(
    teamData.teamPRs[0]?.id || null
  );

  return (
    <Box
      // TODO: Refactor styles to CSS modules
      style={{
        display: 'flex',
        border: '1px solid var(--mantine-color-default-border)',
        borderRadius: 'var(--mantine-radius-sm)',
        padding: 20,
        maxHeight: MAX_HEIGHT,
        overflow: 'hidden',
      }}
    >
      <Box
        style={{
          maxWidth: 200,
          marginRight: 15,
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <PRList
          teamPRs={teamData.teamPRs}
          selectedPR={selectedPR}
          onSelectPR={setSelectedPR}
          maxHeight={MAX_HEIGHT}
        />
      </Box>
      {selectedPR !== null && (
        <Box style={{ flexGrow: 3, maxWidth: 750, overflowY: 'auto' }}>
          <PRDetails pr={teamData.teamPRs.find(pr => pr.id === selectedPR)} />
        </Box>
      )}
    </Box>
  );
};

export default PR;
