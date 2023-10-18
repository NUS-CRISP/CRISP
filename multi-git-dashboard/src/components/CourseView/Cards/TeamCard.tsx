import React from 'react';
import { Card, Text, Group, Table } from '@mantine/core';
import { User } from '@/types/user';

interface TeamCardProps {
  number: number;
  members: User[];
  TA: User;
}

const TeamCard: React.FC<TeamCardProps> = ({ number, members, TA }) => {
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
      <Group mt="md" mb="xs">
        <Text> Team {number.toString()}</Text>
      </Group>

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
