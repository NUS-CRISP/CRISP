import React from 'react';
import { Card, Table, Text } from '@mantine/core';
import { SheetData } from '@shared/types/SheetData';

interface SheetDataTableProps {
  data: SheetData;
  pendingSubmissions: string[][];
}

const SheetDataTable: React.FC<SheetDataTableProps> = ({
  data,
  pendingSubmissions,
}) => {
  const headers = data.headers;
  const rows = data.rows;
  const fetchedAt = data.fetchedAt.toLocaleString();
  const headerWidths = ['10%', '35%', '10%', '45%'];

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
              {headers.map((header, index) => (
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
              {headers.map((header, index) => (
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
            {rows.map((row, rowIndex) => (
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
