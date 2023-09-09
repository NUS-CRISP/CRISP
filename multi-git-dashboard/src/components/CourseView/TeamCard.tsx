import React from 'react';
import { Card, Text, Group, Table } from '@mantine/core';

interface User {
  _id: string;
  name: string;
  email: string;
  gitHandle: string;
}

interface TeamCardProps {
  teamNumber: number;
  assistant: User | null;
  students: User[];
}

const TeamCard: React.FC<TeamCardProps> = ({ teamNumber, assistant, students }) => {
  const student_rows = students?.map((student) => (
    <tr key={student._id}>
      <td>{student.name}</td>
      <td>{student.email}</td>
      <td>{student.gitHandle}</td>
    </tr>
  ));

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group position="apart" mt="md" mb="xs">
        <Text weight={500}>Team {teamNumber.toString()}</Text>
      </Group>

      <Text>
        Teaching Assistant: {assistant?.name || 'N/A'}
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
