import React from 'react';
import { Card, Text, Group, Table } from '@mantine/core';
import { User } from '@/types/user';

interface TeamCardProps {
  number: number;
  members: User[];
  ta: User;
}

const TeamCard: React.FC<TeamCardProps> = ({ number, members, ta }) => {
  const student_rows = members.map((member) => {
    return (<tr key={member._id}>
      <td>{member.name}</td>
      <td>{member.email}</td>
      <td>{member.gitHandle}</td>
    </tr>)
  });

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group position="apart" mt="md" mb="xs">
        <Text weight={500}>Team {number.toString()}</Text>
      </Group>

      <Text>
        Teaching Assistant: {ta?.name || 'N/A' }
      </Text>
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
