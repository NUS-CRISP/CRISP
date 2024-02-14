import React from 'react';
import { Table } from '@mantine/core';
import { TransformedData } from './fetchDataFromSheets';

interface SheetsDataTableProps {
  data: TransformedData;
}

const SheetsDataTable: React.FC<SheetsDataTableProps> = ({ data }) => {
  const [headers, ...rows] = data;

  return (
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
  );
};

export default SheetsDataTable;
