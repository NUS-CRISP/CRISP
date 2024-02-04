import { Box, Button, Notification, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import CSVUpload from '../csv/CSVUpload';

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
  const apiRoute = `/courses/${courseId}/teams/students`;
  const csvTemplateHeaders = ['identifier', 'teamNumber'];

  const form = useForm({
    initialValues: {
      identifier: '',
      teamNumber: 0,
    },
  });
  const [error, setError] = useState<string | null>(null);

  const transformStudentData = (data: unknown[]) => {
    const students = data as StudentTeamFormUser[];
    return students.map((student: StudentTeamFormUser) => ({
      identifier: student.identifier || '',
      teamSet: teamSet,
      teamNumber: student.teamNumber,
    }));
  };

  const handleSubmitForm = async () => {
    try {
      const response = await fetch(apiRoute, {
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
      if (!response.ok) {
        console.error('Error creating team:', response.statusText);
        setError('Error creating team. Please try again.');
        return;
      }
      const data = await response.json();
      console.log('Team created:', data);
      onTeamCreated();
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
          label="Student ID (NUS Net)"
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
        headers={csvTemplateHeaders}
        onProcessComplete={onTeamCreated}
        onError={setError}
        filename="students_team_template.csv"
        uploadButtonString="Upload Students"
        urlString={apiRoute}
        transformFunction={transformStudentData}
      />
    </Box>
  );
};

export default StudentTeamForm;
