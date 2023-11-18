import {
  Box,
  Button,
  Group,
  Notification,
  Text,
  TextInput,
} from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import { useForm } from '@mantine/form';
import { IconPhoto, IconUpload, IconX } from '@tabler/icons-react';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import { useCallback, useState } from 'react';

const backendPort = process.env.BACKEND_PORT || 3001;

interface StudentTeamFormProps {
  courseId: string | string[] | undefined;
  teamSet: string;
  onTeamCreated: () => void;
}

interface StudentTeamFormUser {
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

const StudentTeamForm: React.FC<StudentTeamFormProps> = ({
  courseId,
  teamSet,
  onTeamCreated,
}) => {
  const form = useForm({
    initialValues: {
      identifier: '',
      teamNumber: 0,
    },
  });

  const [students, setStudents] = useState<StudentTeamFormUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback((file: File) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = function () {
        Papa.parse(reader.result as string, {
          header: true,
          skipEmptyLines: true,
          complete: function (results: Results) {
            const studentsData = results.data;
            const students = studentsData.map(
              (student: StudentTeamFormUser) => ({
                identifier: student.identifier || '',
                teamSet: teamSet,
                teamNumber: student.teamNumber,
              })
            );
            setStudents(students);
          },
          error: function (error: Error) {
            console.error('CSV parsing error:', error.message);
            setError('Error cparsing CSV. Please check the format.');
          },
        });
      };
      reader.readAsText(file);
    }
  }, []);

  const downloadCsvTemplate = () => {
    const csvHeaders = 'identifier,teamNumber\n';
    const blob = new Blob([csvHeaders], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, 'students_team_template.csv');
  };

  const handleSubmitCSV = async () => {
    if (students.length === 0) {
      console.log('No teams to upload.');
      return;
    }

    console.log('Sending teams data:', students);

    try {
      const response = await fetch(
        `http://${process.env.NEXT_PUBLIC_DOMAIN}:${backendPort}/api/courses/${courseId}/teams/students`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: students,
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

  const handleSubmitForm = async () => {
    console.log('Sending teams data:', form.values);

    try {
      const response = await fetch(
        `http://${process.env.NEXT_PUBLIC_DOMAIN}:${backendPort}/api/courses/${courseId}/teams/students`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: [
              {
                identifier: form.values.identifier,
                teamSet: teamSet,
                teamNumber: form.values.teamNumber,
              },
            ],
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
      <form onSubmit={form.onSubmit(handleSubmitForm)}>
        <TextInput
          withAsterisk
          label="Student ID"
          {...form.getInputProps('identifier')}
          value={form.values.identifier}
          onChange={event => {
            form.setFieldValue('identifier', event.currentTarget.value);
          }}
        />
        <TextInput
          withAsterisk
          label="Team Number"
          {...form.getInputProps('teamNumber')}
          value={form.values.teamNumber}
          onChange={event => {
            form.setFieldValue('teamNumber', +event.currentTarget.value);
          }}
        />
        <Button type="submit" style={{ marginTop: '16px' }}>
          Upload Student
        </Button>
      </form>

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
        Upload Students
      </Button>
      <Button onClick={downloadCsvTemplate} style={{ marginTop: '16px' }}>
        Download CSV Template
      </Button>
    </Box>
  );
};

export default StudentTeamForm;
