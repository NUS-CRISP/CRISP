import React, { useEffect, useState } from 'react';
import { Button, Card, Group, Select, Table, Text } from '@mantine/core';
import { Assessment } from '@shared/types/Assessment';
import { SheetData } from '@shared/types/SheetData';
import SheetDataTable from '../google/SheetDataTable ';
import { MarkItem, Result } from '@shared/types/Result';
import { hasFacultyPermission } from '@/lib/auth/utils';

interface AssessmentOverviewProps {
  assessment: Assessment | null;
  sheetData: SheetData | null;
  onUpdateSheetData: () => void;
}

const AssessmentOverview: React.FC<AssessmentOverviewProps> = ({
  assessment,
  sheetData,
  onUpdateSheetData,
}) => {
  const [pendingSubmissions, setPendingSubmissions] = useState<string[][]>([]);
  const [teamFilter, setTeamFilter] = useState<string>('All Teams');

  const assessmentSheetApiRoute = `/api/assessments/${assessment?._id}/googlesheets`;

  const fetchNewSheetDataInd = async () => {
    try {
      const response = await fetch(assessmentSheetApiRoute, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ team: false }),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch new sheet data');
      }
      onUpdateSheetData();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fetchNewSheetDataTeam = async () => {
    try {
      const response = await fetch(assessmentSheetApiRoute, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ team: true }),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch new sheet data');
      }
      onUpdateSheetData();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const calculatePendingSubmissions = async () => {
    if (!assessment || !sheetData) return;

    const results: Result[] = await assessment.results;
    const pending: string[][] = [];

    results.forEach((result: Result) => {
      result.marks.forEach((item: MarkItem) => {
        const isSubmitted = sheetData.rows.some(row => row.includes(item.user));
        if (!isSubmitted) {
          const pendingRow = [
            item.user,
            item.name,
            result.team?.number?.toString() || 'EMPTY',
            result.marker?.name || 'EMPTY',
          ];
          console.log(pendingRow);
          pending.push(pendingRow);
        }
      });
    });

    setPendingSubmissions(pending);
  };

  const handleFilterChange = (value: string | null) => {
    setTeamFilter(value || 'All Teams');
  };

  useEffect(() => {
    calculatePendingSubmissions();
  }, [assessment, sheetData]);

  const teamOptions = [
    'All Teams',
    ...new Set(sheetData?.rows.map(row => row[2])),
  ]
    .filter(team => team !== 'EMPTY')
    .map(team => ({ value: team, label: `${team}` }));

  const filteredSheetData: SheetData = sheetData
    ? {
        ...sheetData,
        rows: sheetData.rows.filter(row =>
          teamFilter === 'All Teams' ? true : row[2] === teamFilter
        ),
      }
    : {
        _id: '',
        fetchedAt: '' as unknown as Date,
        headers: [],
        rows: [[]],
      };

  const filteredPendingSubmissions: string[][] = pendingSubmissions
    ? pendingSubmissions.filter(row =>
        teamFilter === 'All Teams' ? true : row[2] === teamFilter
      )
    : [[]];

  return (
    <div>
      <Card style={{ marginBottom: '16px', marginTop: '16px' }}>
        <Text size="lg" style={{ marginBottom: '10px' }}>
          Assessment Details
        </Text>
        <Text>Assessment Type: {assessment?.assessmentType}</Text>
        <Text>Mark Type: {assessment?.markType}</Text>
        <Text>Frequency: {assessment?.frequency}</Text>
        <Text>Granularity: {assessment?.granularity}</Text>
        <Text>
          Form Link:{' '}
          <a
            href={assessment?.formLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            {assessment?.formLink}
          </a>
        </Text>
      </Card>
      {hasFacultyPermission() && (
        <Group style={{ marginBottom: '16px', marginTop: '16px' }}>
          <Button onClick={fetchNewSheetDataInd}>Update Sheets Data</Button>
          <Select
            label="Filter by Team"
            placeholder="Select a team"
            data={teamOptions}
            value={teamFilter}
            onChange={handleFilterChange}
            style={{ marginBottom: '20px' }}
          />
        </Group>
      )}
      {sheetData ? (
        <SheetDataTable
          data={filteredSheetData}
          pendingSubmissions={filteredPendingSubmissions}
        />
      ) : (
        <Table striped highlightOnHover>
          <tbody>
            <tr>
              <td>
                <Text>No data available</Text>
              </td>
            </tr>
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default AssessmentOverview;
