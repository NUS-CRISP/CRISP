import React, { useState, useCallback } from 'react';
import { Box, Button, Notification, Group, Text } from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { IconPhoto, IconUpload, IconX } from '@tabler/icons-react';

const backendPort = process.env.BACKEND_PORT || 3001;
const apiUrl = `http://${process.env.NEXT_PUBLIC_DOMAIN}:${backendPort}/api/assessments/`;

interface ResultFormProps {
  assessmentId: string;
  onResultsUploaded: () => void;
}

interface Result {
  teamId: string;
  studentId: string;
  mark: string;
}

const ResultForm: React.FC<ResultFormProps> = ({
  assessmentId,
  onResultsUploaded,
}) => {
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback((file: File) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        Papa.parse(reader.result as string, {
          header: true,
          skipEmptyLines: true,
          complete: function (results) {
            const resultData = results.data as Result[];
            setResults(resultData);
          },
          error: function (error: Error) {
            console.error('Error parsing CSV:', error.message);
            setError('Error parsing CSV. Please check the format.');
          },
        });
      };
      reader.readAsText(file);
    }
  }, []);

  const downloadCsvTemplate = () => {
    const csvHeaders = 'teamNumber,studentId,mark\n';
    const blob = new Blob([csvHeaders], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, 'results_template.csv');
  };

  const handleSubmitCSV = async () => {
    if (results.length === 0) {
      console.log('No results to upload.');
      return;
    }

    console.log('Sending results data:', results);

    try {
      const response = await fetch(`${apiUrl}${assessmentId}/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: results,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Results created:', data);
        onResultsUploaded();
      } else {
        console.error('Error uploading results:', response.statusText);
        setError('Error uploading results. Please try again.');
      }
    } catch (error) {
      console.error('Error uploading results:', error);
      setError('Error uploading results. Please try again.');
    }
  };

  return (
    <Box>
      {error && (
        <Notification title="Error" color="red" onClose={() => setError(null)}>
          {error}
        </Notification>
      )}

      <Dropzone
        onDrop={(files: File[]) => {
          if (files.length > 0) {
            handleFileUpload(files[0]);
          }
        }}
        accept={[MIME_TYPES.csv]}
        maxSize={1024 * 1024 * 5}
        maxFiles={1}
        multiple={false}
        style={{ marginTop: '16px' }}
      >
        <Group mih={220} style={{ pointerEvents: 'none' }}>
          <Dropzone.Accept>
            <IconUpload
              style={{ color: 'var(--mantine-color-blue-6)' }}
              stroke={1.5}
            />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX
              style={{ color: 'var(--mantine-color-red-6)' }}
              stroke={1.5}
            />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconPhoto
              style={{ color: 'var(--mantine-color-dimmed)' }}
              stroke={1.5}
            />
          </Dropzone.Idle>
          <div>
            <Text size="xl" inline>
              Drag CSV here or click to select files
            </Text>
            <Text size="sm" c="dimmed" inline mt={7}>
              Attach as many files as you like, each file should not exceed 5mb
            </Text>
          </div>
        </Group>
      </Dropzone>
      <Button onClick={handleSubmitCSV} style={{ marginTop: '16px' }}>
        Upload Results
      </Button>
      <Button onClick={downloadCsvTemplate} style={{ marginTop: '16px' }}>
        Download CSV Template
      </Button>
    </Box>
  );
};

export default ResultForm;
