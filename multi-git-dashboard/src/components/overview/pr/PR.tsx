import { Box } from '@mantine/core';
import { useState } from 'react';
import { OverviewProps } from '../../cards/OverviewCard';
import PRDetails from './PRDetails';
import PRList from './PRList';

export interface PRProps {
  team?: OverviewProps['team'];
  teamData: OverviewProps['teamData'];
}

const PR: React.FC<PRProps> = ({ team, teamData }) => {
  const MAX_HEIGHT = 500;

  const [selectedPR, setSelectedPR] = useState<number | null>(
    teamData.teamPRs[0]?.id || null
  );
  const [showLastWeek, setShowLastWeek] = useState(false);

  // Filter only team members, then filter by last week if applicable
  const getDisplayedPRs = () => {
    // const teamPRs = teamData.teamPRs.filter(pr => team?.members.some(member => member.gitHandle === pr.user));
    const teamPRs = teamData.teamPRs;
    if (showLastWeek) {
      return teamPRs.filter(
        pr => new Date(pr.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );
    }
    return teamPRs;
  }

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
          team={team}
          teamPRs={getDisplayedPRs()}
          selectedPR={selectedPR}
          onSelectPR={setSelectedPR}
          maxHeight={MAX_HEIGHT}
        />
      </Box>
      {selectedPR !== null && (
        <Box style={{ flexGrow: 3, maxWidth: 750, overflowY: 'auto' }}>
          <PRDetails
            pr={teamData.teamPRs.find(pr => pr.id === selectedPR)}
            showLastWeek={showLastWeek}
            setShowLastWeek={setShowLastWeek}
          />
        </Box>
      )}
    </Box>
  );
};

export default PR;
