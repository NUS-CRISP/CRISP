import { Box, Button, Group, Notification, Text } from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import { IconPhoto, IconUpload, IconX } from '@tabler/icons-react';
import { saveAs } from 'file-saver';
import Papa, { ParseResult } from 'papaparse';
import { useCallback, useState } from 'react';

interface TATeamFormProps {
  courseId: string | string[] | undefined;
  teamSet: string;
  onTeamCreated: () => void;
}

interface TATeamFormUser {
  identifier: string;
  teamSet: string;
  teamNumber: number;
}

const TATeamForm: React.FC<TATeamFormProps> = ({
  courseId,
  teamSet,
  onTeamCreated,
}) => {
  const [TAs, setTAs] = useState<TATeamFormUser[]>([]);

  const handleFileUpload = useCallback((file: File) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = function () {
        Papa.parse(reader.result as string, {
          header: true,
          skipEmptyLines: true,
          complete: function (results: ParseResult<TATeamFormUser>) {
            const TAsData = results.data;
            const TAs = TAsData.map((TA: TATeamFormUser) => ({
              identifier: TA.identifier || '',
              teamSet: teamSet,
              teamNumber: TA.teamNumber,
            }));
            setTAs(TAs);
          },
          error: function (error: Error) {
            console.error('CSV parsing error:', error.message);
          },
        });
      };
      reader.readAsText(file);
    }
  }, []);

  const [error, setError] = useState<string | null>(null);

  const downloadCsvTemplate = () => {
    const csvHeaders = 'identifier,teamNumber\n';
    const blob = new Blob([csvHeaders], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, 'tas_team_template.csv');
  };

  const handleSubmitCSV = async () => {
    if (TAs.length === 0) {
      console.log('No teams to upload.');
      return;
    }

    console.log('Sending teams data:', TAs);

    try {
      const response = await fetch(
        `http://localhost:${process.env.NEXT_PUBLIC_BACKEND_PORT}/api/courses/${courseId}/teams/tas`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: TAs,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Team created:', data);
        onTeamCreated();
      } else {
        console.error('Error creating team:', response.statusText);
        setError('Error creating team. Please try again.');
      }
    } catch (error) {
      console.error('Error creating team:', error);
      setError('Error creating team. Please try again.');
    }
  };

  return (
    <Box maw={300} mx="auto">
      {error && (
        <Notification title="Error" color="red" onClose={() => setError(null)}>
          {error}
        </Notification>
      )}

      <Dropzone
        onDrop={(files: File[]) => {
          console.error(files);
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
              Drag images here or click to select files
            </Text>
            <Text size="sm" c="dimmed" inline mt={7}>
              Attach as many files as you like, each file should not exceed 5mb
            </Text>
          </div>
        </Group>
      </Dropzone>
      <Button onClick={handleSubmitCSV} style={{ marginTop: '16px' }}>
        Upload TAs
      </Button>
      <Button onClick={downloadCsvTemplate} style={{ marginTop: '16px' }}>
        Download CSV Template
      </Button>
    </Box>
  );
};

export default TATeamForm;
