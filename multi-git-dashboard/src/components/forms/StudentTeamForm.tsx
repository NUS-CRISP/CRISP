import { Box, Button, Notification, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import CSVUpload from './CSVUpload';

const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || 3001;

interface StudentTeamFormProps {
  courseId: string | string[] | undefined;
  teamSet: string;
  onTeamCreated: () => void;
}

interface StudentTeamFormUser {
  identifier: string;
  teamNumber: number;
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

  const [error, setError] = useState<string | null>(null);
  const apiUrl = `http://${process.env.NEXT_PUBLIC_DOMAIN}:${backendPort}/api/courses/${courseId}/teams/students`;
  const csvTemplateHeaders = 'identifier,teamNumber';

  const transformStudentData = (data: unknown[]) => {
    const students = data as StudentTeamFormUser[];
    return students.map((student: StudentTeamFormUser) => ({
      identifier: student.identifier || '',
      teamSet: teamSet,
      teamNumber: student.teamNumber,
    }));
  };

  const handleSubmitForm = async () => {
    console.log('Sending teams data:', form.values);

    try {
      const response = await fetch(apiUrl, {
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
      });
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
      <CSVUpload
        templateHeaders={csvTemplateHeaders}
        onProcessComplete={onTeamCreated}
        onError={setError}
        downloadFilename="students_team_template.csv"
        uploadButtonString="Upload Students"
        urlString={apiUrl}
        transformFunction={transformStudentData}
      />
    </Box>
  );
};

export default StudentTeamForm;
