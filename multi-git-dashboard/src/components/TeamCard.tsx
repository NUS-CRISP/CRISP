import React from 'react';
import { Card, Text, Group, Table } from '@mantine/core';

interface TeamCardProps {
  teamNumber: number;
  assitant: any,
  students: any[];
}

const TeamCard: React.FC<TeamCardProps> = ({ teamNumber, assitant, students }) => {
  const student_rows = students?.map((student) => (
    <tr key={student._id}>
      <td>{student.name}</td>
      <td>{student.email}</td>
      <td>{student.gitHandle }</td>
    </tr>
  ));

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group position="apart" mt="md" mb="xs">
        <Text weight={500}>Team {teamNumber.toString()}</Text>
      </Group>

      <Text>Teaching Assitant: {assitant?.name}</Text>
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