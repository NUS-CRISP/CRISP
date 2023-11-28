import { getApiUrl } from '@/lib/apiConfig';
import { ActionIcon, Card, Group, Select, Table, Text } from '@mantine/core';
import { User } from '@shared/types/User';
import { IconX } from '@tabler/icons-react';
import { useState, useEffect } from 'react';

interface TeamCardProps {
  teamId: string;
  number: number;
  members: User[];
  TA: User | null;
  TAs: User[];
  onTeamDeleted: () => void;
}

const TeamCard: React.FC<TeamCardProps> = ({
  teamId,
  number,
  members,
  TA,
  TAs,
  onTeamDeleted,
}) => {
  const [selectedTA, setSelectedTA] = useState<string | null>(TA?._id || null);
  const apiUrl = getApiUrl() + `/teams/${teamId}`;

  useEffect(() => {
    setSelectedTA(TA?._id || null);
  }, [TA]);

  const handleDelete = async () => {
    try {
      const response = await fetch(apiUrl, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete the team');
      }
      console.log('Team deleted');
      onTeamDeleted();
    } catch (error) {
      console.error('Error deleting team:', error);
    }
  };

  const handleTAChange = async (TAId: string | null) => {
    try {
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ TA: TAId }),
      });

      if (!response.ok) {
        throw new Error('Failed to update the team');
      }
      console.log('Team updated');
      setSelectedTA(TAId);
    } catch (error) {
      console.error('Error updating team:', error);
    }
  };

  const taOptions = TAs.map(ta => ({ value: ta._id, label: ta.name }));
  const student_rows = members?.map(member => {
    return (
      <tr key={member._id}>
        <td style={{ textAlign: 'left' }}>{member.name}</td>
        <td style={{ textAlign: 'left' }}>{member.gitHandle}</td>
      </tr>
    );
  });

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      style={{ marginTop: '6px', marginBottom: '6px' }}
      withBorder
    >
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

        <ActionIcon
          variant="transparent"
          color="red"
          size="sm"
          onClick={handleDelete}
          title="Delete Team"
        >
          <IconX size={16} />
        </ActionIcon>
      </div>

      <Group style={{ alignItems: 'center' }}>
        <Text>Teaching Assistant:</Text>
        <Select
          data={taOptions}
          value={selectedTA}
          onChange={e => handleTAChange(e)}
          placeholder="Assign TA"
        />
      </Group>
      <Table>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Name</th>
            <th style={{ textAlign: 'left' }}>Git Handle</th>
          </tr>
        </thead>
        <tbody>{student_rows}</tbody>
      </Table>
    </Card>
  );
};

export default TeamCard;
