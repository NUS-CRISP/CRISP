import React from 'react';
import { Button } from '@mantine/core';
import { saveAs } from 'file-saver';

interface CSVExportProps {
  data: Record<string, unknown>[];
  headers: string[];
  filename: string;
}

const CSVExport: React.FC<CSVExportProps> = ({ data, headers, filename }) => {
  const downloadCsv = () => {
    const csvContent = [
      headers,
      ...data.map(row =>
        headers.map(field => JSON.stringify(row[field] ?? '')).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    saveAs(blob, filename);
  };

  return <Button onClick={downloadCsv}>Export Data</Button>;
};

export default CSVExport;
