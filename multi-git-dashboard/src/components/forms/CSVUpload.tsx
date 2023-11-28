import React, { useState, useCallback } from 'react';
import { Box, Button, Group, Text } from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { IconPhoto, IconUpload, IconX } from '@tabler/icons-react';

interface CSVUploadProps {
  templateHeaders: string;
  onProcessComplete: () => void;
  onError: (message: string) => void;
  downloadFilename: string;
  uploadButtonString: string;
  urlString: string;
  transformFunction?: (data: unknown[]) => unknown[];
}

const CSVUpload: React.FC<CSVUploadProps> = ({
  templateHeaders,
  onProcessComplete,
  onError,
  downloadFilename,
  uploadButtonString,
  urlString,
  transformFunction,
}) => {
  const [items, setItems] = useState<unknown[]>([]);

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
      }
    },
    [setItems, onError]
  );

  const downloadCsvTemplate = () => {
    const blob = new Blob([templateHeaders], {
      type: 'text/csv;charset=utf-8',
    });
    saveAs(blob, downloadFilename);
  };

  const handleSubmitCSV = async () => {
    if (items.length === 0) {
      console.error('Items length is 0');
      onError('No items to upload.');
      return;
    }

    console.log('Sending csv data:', items);

    try {
      const response = await fetch(urlString, {
        method: 'POST',
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
      const data = await response.json();
      console.log('Items created:', data);
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
      <Group style={{ marginTop: '16px' }}>
        <Button onClick={handleSubmitCSV}>{uploadButtonString}</Button>
        <Button onClick={downloadCsvTemplate}>Download CSV Template</Button>
      </Group>
    </Box>
  );
};

export default CSVUpload;
