import React from 'react';
import { Card, Text, Group, Table, ActionIcon } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { User } from '@/types/user';

interface TeamCardProps {
  teamId: string;
  number: number;
  members: User[];
  TA: User;
  onTeamDeleted: () => void;
}

const backendPort = process.env.BACKEND_PORT || 3001;

const TeamCard: React.FC<TeamCardProps> = ({
  teamId,
  number,
  members,
  TA,
  onTeamDeleted,
}) => {
  const handleDelete = async () => {
    try {
      const response = await fetch(
        `http://${process.env.NEXT_PUBLIC_DOMAIN}:${backendPort}/api/teams/${teamId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete the team');
      }
      console.log('Team deleted');
      onTeamDeleted();
    } catch (error) {
      console.error('Error deleting team:', error);
    }
  };

  const student_rows = members?.map(member => {
    if (member.role === 'Student') {
      return (
        <tr key={member._id}>
          <td>{member.name}</td>
          <td>{member.email}</td>
          <td>{member.gitHandle}</td>
        </tr>
      );
    } else {
      return null;
    }
  });

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
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

      <Text>Teaching Assistant: {TA?.name || 'N/A'}</Text>
      <Table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Git Handle</th>
          </tr>
        </thead>
        <tbody>{student_rows}</tbody>
      </Table>
    </Card>
  );
};

export default TeamCard;
