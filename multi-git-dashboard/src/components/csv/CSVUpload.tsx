import { Box, Button, Group, Text } from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import { IconPhoto, IconUpload, IconX } from '@tabler/icons-react';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import React, { useCallback, useState } from 'react';

interface CSVUploadProps {
  headers: string[];
  onProcessComplete: () => void;
  onError: (message: string) => void;
  filename: string;
  uploadButtonString: string;
  urlString: string;
  transformFunction?: (data: unknown[]) => unknown[];
  requestType?: 'POST' | 'PATCH';
}

const CSVUpload: React.FC<CSVUploadProps> = ({
  headers,
  onProcessComplete,
  onError,
  filename,
  uploadButtonString,
  urlString,
  transformFunction,
  requestType = 'POST',
}) => {
  const [items, setItems] = useState<unknown[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const handleFileUpload = useCallback(
    (file: File) => {
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          Papa.parse(reader.result as string, {
            header: true,
            skipEmptyLines: true,
            complete: results => {
              let data = results.data;
              if (transformFunction) {
                data = transformFunction(data);
              }
              setItems(data);
            },
            error: (error: Error) => {
              console.error('Error parsing CSV:', error.message);
              onError(`Error parsing CSV: ${error.message}`);
            },
          });
        };
        reader.readAsText(file);
        setUploadedFileName(file.name);
      }
    },
    [setItems, onError, setUploadedFileName]
  );

  const downloadCsvTemplate = () => {
    const blob = new Blob([headers.join(',')], {
      type: 'text/csv;charset=utf-8',
    });
    saveAs(blob, filename);
  };

  const handleSubmitCSV = async () => {
    if (items.length === 0) {
      console.error('Items length is 0');
      onError('No items to upload.');
      return;
    }

    try {
      const response = await fetch(urlString, {
        method: requestType,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items,
        }),
      });

      if (!response.ok) {
        console.error('Error uploading csv items:', response.statusText);
        onError('Error uploading items. Please try again.');
        return;
      }
      await response.json();
      onProcessComplete();
    } catch (error) {
      console.error('Error uploading csv items:', error);
      onError('Error uploading items. Please try again.');
    }
  };

  return (
    <Box>
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
          <Text size="xl" inline>
            Drag CSV here or click to select files
          </Text>
        </Group>
      </Dropzone>
      {uploadedFileName ? (
        <Text size="md" style={{ marginTop: '4px' }}>
          Selected file: {uploadedFileName}
        </Text>
      ) : (
        <Text size="md" style={{ marginTop: '4px' }}>
          No file selected
        </Text>
      )}
      <Group style={{ marginTop: '16px' }}>
        <Button onClick={handleSubmitCSV}>{uploadButtonString}</Button>
        <Button onClick={downloadCsvTemplate}>Download CSV Template</Button>
      </Group>
    </Box>
  );
};

export default CSVUpload;
