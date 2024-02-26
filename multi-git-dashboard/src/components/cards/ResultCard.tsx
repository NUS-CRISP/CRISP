import { hasFacultyPermission } from '@/lib/auth/utils';
import { Card, Grid, Group, Select, Space, Table, Text } from '@mantine/core';
import { Result } from '@shared/types/Result';
import { User } from '@shared/types/User';
import React, { useEffect, useState } from 'react';

interface ResultCardProps {
  result: Result;
  teachingTeam: User[];
  assessmentId: string;
}

const ResultCard: React.FC<ResultCardProps> = ({
  result,
  teachingTeam,
  assessmentId,
}) => {
  const apiRoute = `/api/assessments/${assessmentId}/results/${result._id}/marker`;

  const [selectedMarker, setSelectedMarker] = useState<string | null>(
    result.marker?._id || null
  );

  useEffect(() => {
    setSelectedMarker(result.marker?._id || null);
  }, [result.marker]);

  const handleMarkerChange = async (markerId: string | null) => {
    try {
      const response = await fetch(apiRoute, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markerId }),
      });

      if (!response.ok) {
        console.error('Error updating team:', response.statusText);
        return;
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
      <Table.Tr key={mark.user}>
        <Table.Td style={{ textAlign: 'left' }}>{mark.name}</Table.Td>
        <Table.Td style={{ textAlign: 'left' }}>{mark.user}</Table.Td>
        <Table.Td style={{ textAlign: 'left' }}>{mark.mark}</Table.Td>
      </Table.Tr>
    );
  });

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{ marginTop: '6px', marginBottom: '6px' }}
    >
      <Grid>
        <Grid.Col span={12}>
          <Group>
            <Text>
              {result.team
                ? `Team ${result.team.number}`
                : 'Individual Assessment'}
            </Text>
            {hasFacultyPermission() && (
              <Select
                value={selectedMarker}
                onChange={handleMarkerChange}
                data={taOptions}
                placeholder={
                  result.marker ? result.marker.name : 'None assigned'
                }
              />
            )}
            {!hasFacultyPermission() && (
              <Text>
                Marker: {result.marker ? result.marker.name : 'None assigned'}
              </Text>
            )}
          </Group>
        </Grid.Col>
      </Grid>
      <Space h="md" />
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ textAlign: 'left', width: '60%' }}>
              {result.team ? 'Team Member' : 'Student'}
            </Table.Th>
            <Table.Th style={{ textAlign: 'left', width: '25%' }}>ID</Table.Th>
            <Table.Th style={{ textAlign: 'left', width: '15%' }}>
              Score
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{studentRows}</Table.Tbody>
      </Table>
    </Card>
  );
};

export default ResultCard;
