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

  return (
    <div>
      <Text size="sm">Data fetched on: {fetchedAt}</Text>
      <Card style={{ marginTop: '20px' }}>
        <Text size="lg" style={{ marginBottom: '10px' }}>
          Pending Submissions
        </Text>
        <Table>
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th key={index}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pendingSubmissions.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <Card style={{ marginTop: '20px' }}>
        <Text size="lg" style={{ marginBottom: '10px' }}>
          Completed Submissions
        </Text>
        <Table striped highlightOnHover>
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th key={index}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
};

export default SheetDataTable;
