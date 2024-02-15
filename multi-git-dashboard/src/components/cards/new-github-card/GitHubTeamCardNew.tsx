import { Box, Container } from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';
import { useState } from 'react';
import PRDetails from './PRDetails';
import PRList from './PRList';
import TeamAnalyticsView from './TeamAnalyticsView';

interface GitHubTeamCardNewProps {
  teamData: TeamData;
}

const GitHubTeamCardNew: React.FC<GitHubTeamCardNewProps> = ({ teamData }) => {
  const [selectedPR, setSelectedPR] = useState<number | null>(
    teamData.teamPRs[0]?.id || null
  );

  return (
    <Container>
      <Box mb={20}>
        <TeamAnalyticsView teamData={teamData} />
      </Box>
      <Box
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
    </Container>
  );
};

export default GitHubTeamCardNew;
