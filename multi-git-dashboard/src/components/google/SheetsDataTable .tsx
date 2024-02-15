import React from 'react';
import { Table, Text } from '@mantine/core';
import { SheetsData } from '@shared/types/SheetsData';

interface SheetsDataTableProps {
  data: SheetsData;
}

const SheetsDataTable: React.FC<SheetsDataTableProps> = ({ data }) => {
  const headers = data.headers;
  const rows = data.rows;
  const fetchedAt = data.fetchedAt.toLocaleString();

  return (
    <>
      <Text size="sm">Data fetched on: {fetchedAt}</Text>
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
    </>
  );
};

export default SheetsDataTable;
