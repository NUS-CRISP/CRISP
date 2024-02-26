import React, { useEffect, useState } from 'react';
import { Button, Card, Space, Table, Text } from '@mantine/core';
import { Assessment } from '@shared/types/Assessment';
import { SheetData } from '@shared/types/SheetData';
import SheetDataTable from '../google/SheetDataTable ';
import { MarkItem, Result } from '@shared/types/Result';

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

  const assessmentSheetApiRoute = `/api/assessments/${assessment?._id}/googlesheets`;

  const fetchNewSheetData = async () => {
    try {
      const response = await fetch(assessmentSheetApiRoute, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

  useEffect(() => {
    calculatePendingSubmissions();
  }, [assessment, sheetData]);

  return (
    <div>
      <Card style={{ marginBottom: '20px' }}>
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
      <Space h="md" />
      <Button onClick={fetchNewSheetData}>Update Sheets Data</Button>
      {sheetData ? (
        <SheetDataTable
          data={sheetData}
          pendingSubmissions={pendingSubmissions}
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
