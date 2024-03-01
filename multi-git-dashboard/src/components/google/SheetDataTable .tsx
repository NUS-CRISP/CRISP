import React from 'react';
import { Card, Table, Text } from '@mantine/core';
import { SheetData } from '@shared/types/SheetData';

interface SheetDataTableProps {
  data: SheetData;
  pendingSubmissions: string[][];
  isTeam: boolean;
}

const SheetDataTable: React.FC<SheetDataTableProps> = ({
  data,
  pendingSubmissions,
  isTeam,
}) => {
  const dataHeaders = data.headers;
  const dataRows = data.rows;
  const fetchedAt: string = data.fetchedAt.toLocaleString();

  const pendingHeadersInd: string[] = ['Identifier', 'Name', 'Team', 'Marker'];
  const pendingHeadersTeam: string[] = ['Team', 'Marker'];
  const headerWidthsInd: string[] = ['10%', '35%', '10%', '45%'];
  const headerWidthsTeam: string[] = ['50%', '50%'];

  const pendingHeaders = isTeam ? pendingHeadersTeam : pendingHeadersInd;
  const headerWidths = isTeam ? headerWidthsTeam : headerWidthsInd;

  return (
    <div>
      <Text size="sm">Data fetched on: {fetchedAt}</Text>
      <Card style={{ marginTop: '20px' }}>
        <Text size="lg" style={{ marginBottom: '10px' }}>
          Pending Submissions
        </Text>
        <Table>
          <Table.Thead>
            <Table.Tr>
              {pendingHeaders.map((header, index) => (
                <Table.Th
                  style={{ textAlign: 'left', width: headerWidths[index] }}
                  key={index}
                >
                  {header}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {pendingSubmissions.map((row, rowIndex) => (
              <Table.Tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <Table.Td key={`${rowIndex}-${cellIndex}`}>{cell}</Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
      <Card style={{ marginTop: '20px' }}>
        <Text size="lg" style={{ marginBottom: '10px' }}>
          Completed Submissions
        </Text>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              {dataHeaders.map((header, index) => (
                <Table.Th
                  style={{ textAlign: 'left', width: headerWidths[index] }}
                  key={index}
                >
                  {header}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {dataRows.map((row, rowIndex) => (
              <Table.Tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <Table.Td key={`${rowIndex}-${cellIndex}`}>{cell}</Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </div>
  );
};

export default SheetDataTable;
