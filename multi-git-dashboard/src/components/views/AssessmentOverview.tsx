import React from 'react';
import { Button, Group, Table, Text } from '@mantine/core';
import { Assessment } from '@shared/types/Assessment';
import { SheetData } from '@shared/types/SheetData';
import SheetDataTable from '../google/SheetDataTable ';

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
  const assessmentSheetApiRoute = `/api/assessment/${assessment?._id}/googlesheets`;

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
  return (
    <div>
      <Group style={{ marginBottom: '16px', marginTop: '16px' }}>
        <Button onClick={fetchNewSheetData}>Update Sheets Data</Button>
      </Group>
      <Text>Assessment Type: {assessment?.assessmentType}</Text>
      <Text>Mark Type: {assessment?.markType}</Text>
      <Text>Frequency: {assessment?.frequency}</Text>
      <Text>Granularity: {assessment?.granularity}</Text>
      <Text>Form Link: {assessment?.formLink}</Text>
      {sheetData ? (
        <SheetDataTable data={sheetData} />
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
