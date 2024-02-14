import { Container, Flex } from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';
import { useState } from 'react';
import PRDetails from './PRDetails';
import PRList from './PRList';
import TeamCharts from './TeamCharts';

interface GitHubTeamCardNewProps {
  teamData: TeamData;
}

const GitHubTeamCardNew: React.FC<GitHubTeamCardNewProps> = ({ teamData }) => {
  const [selectedPR, setSelectedPR] = useState<number | null>(null);

  return (
    <div>
      <TeamCharts teamData={teamData} />
      <Flex>
        <Container maw={200}>
          <PRList
            teamPRs={teamData.teamPRs}
            selectedPR={selectedPR}
            onSelectPR={setSelectedPR}
          />
        </Container>
        {selectedPR !== null && (
          <div style={{ flexGrow: 1, maxWidth: 750 }}>
            <PRDetails pr={teamData.teamPRs.find(pr => pr.id === selectedPR)} />
          </div>
        )}
      </Flex>
    </div>
  );
};

export default GitHubTeamCardNew;
