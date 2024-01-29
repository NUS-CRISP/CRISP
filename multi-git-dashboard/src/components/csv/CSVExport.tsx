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
    const csvData = [
      headers + '\n',
      ...data.map(row =>
        headers.map(header => `"${row[header] || ''}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, filename);
  };

  return <Button onClick={downloadCsv}>Export Data</Button>;
};

export default CSVExport;
