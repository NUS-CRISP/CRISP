import React, { useEffect, useState } from 'react';
import { Card, Group, Select, Table, Text } from '@mantine/core';
import { Result } from '@shared/types/Result';
import { User } from '@shared/types/User';

interface ResultCardProps {
  result: Result;
  teachingTeam: User[];
  assessmentId: string;
}

const backendPort = process.env.BACKEND_PORT || 3001;

const ResultCard: React.FC<ResultCardProps> = ({
  result,
  teachingTeam,
  assessmentId,
}) => {
  const [selectedMarker, setSelectedMarker] = useState<string | null>(
    result.marker?._id || null
  );

  useEffect(() => {
    setSelectedMarker(result.marker?._id || null);
  }, [result.marker]);

  const handleMarkerChange = async (markerId: string | null) => {
    try {
      const response = await fetch(
        `http://${process.env.NEXT_PUBLIC_DOMAIN}:${backendPort}/api/assessments/${assessmentId}/results/${result._id}/marker`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ markerId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update the team');
      }
      console.log('Marker updated');
      setSelectedMarker(markerId);
    } catch (error) {
      console.error('Error updating team:', error);
    }
  };

  const taOptions = teachingTeam.map(user => ({
    value: user._id,
    label: user.name,
  }));

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

      <Select
        value={selectedMarker}
        onChange={handleMarkerChange}
        data={taOptions}
        placeholder="Assign Marker"
        style={{ flex: 1 }}
      />

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
