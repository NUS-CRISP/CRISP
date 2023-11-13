import React from 'react';
import { Card, Group, Table, Text } from '@mantine/core';
import { Result } from '@shared/types/Result';

interface ResultCardProps {
  result: Result;
}

const ResultCard: React.FC<ResultCardProps> = ({ result }) => {
  const studentRows = result.marks.map(mark => {
    return (
      <tr key={mark.userId}>
        <td>{mark.name}</td>
        <td>{mark.userId}</td>
        <td>{mark.mark}</td>
      </tr>
    );
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
          <Text>
            {result.team
              ? `Team ${result.team.number}`
              : 'Individual Assessment'}
          </Text>
        </Group>
      </div>

      <Table>
        <thead>
          <tr>
            <th>{result.team ? 'Team Member' : 'Student'}</th>
            <th>ID</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>{studentRows}</tbody>
      </Table>
    </Card>
  );
};

export default ResultCard;
