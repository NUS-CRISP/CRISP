import React, { useState, useCallback } from 'react';
import { Box, Button, Group, Text, Notification } from '@mantine/core';
import { IconUpload, IconPhoto, IconX } from '@tabler/icons-react';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import Papa from 'papaparse';

const backendPort = process.env.BACKEND_PORT || 3001;

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

interface Results {
  data: {
    identifier: string;
    teamSet: string;
    teamNumber: number;
  }[];
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
          complete: function (results: Results) {
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

  const handleSubmitCSV = async () => {
    if (TAs.length === 0) {
      console.log('No teams to upload.');
      return;
    }

    console.log('Sending teams data:', TAs);

    try {
      const response = await fetch(
        `http://${process.env.NEXT_PUBLIC_DOMAIN}:${backendPort}/api/courses/${courseId}/teams/tas`,
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
    </Box>
  );
};

export default TATeamForm;
