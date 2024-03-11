import { Card, Group, Text } from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';
import { User } from '@shared/types/User';

interface ProjectManagementCardProps {
  // teamId: string;
  number: number;
  // members: User[];
  TA: User | null;
  // teachingTeam: User[];
  teamData: TeamData | null;
  // teamDataList: TeamData[];
  onUpdate: () => void;
  // isEditing?: boolean;
}

const ProjectManagementCard: React.FC<ProjectManagementCardProps> = ({
  number,
  TA,
  teamData,
  onUpdate,
}) => {
  return (
    <Card shadow="sm" padding="lg" radius="md" my={6} withBorder>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start',
        }}
      >
        <Group mt="md" mb="xs">
          <Text> Team {number.toString()}</Text>
        </Group>
      </div>

      <Group style={{ alignItems: 'center' }}>
        <Text>Teaching Assistant:</Text>
        <Text>{TA ? TA.name : 'None'}</Text>
      </Group>
      <Group style={{ alignItems: 'center' }}>
        <Text>Repository:</Text>
        <Text>{teamData ? teamData.repoName : 'None'}</Text>
      </Group>
    </Card>
  );
};

export default ProjectManagementCard;
