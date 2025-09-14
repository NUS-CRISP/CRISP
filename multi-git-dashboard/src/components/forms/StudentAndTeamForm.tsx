import { Box, Button, Divider, Notification, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import CSVUpload from '../csv/CSVUpload';

interface StudentAndTeamFormProps {
  courseId: string | string[] | undefined;
  onStudentCreated: () => void;
}

interface StudentAndTeamFormUser {
  identifier: string;
  name: string;
  gitHandle: string;
  email: string;
  teamNumber: number;
}

const StudentAndTeamForm: React.FC<StudentAndTeamFormProps> = ({
  courseId,
  onStudentCreated,
}) => {
  const apiRoute = `/api/courses/${courseId}/students/teams`;
  const csvTemplateHeaders = ['name', 'identifier', 'email', 'gitHandle', 'teamNumber'];

  const form = useForm({
    initialValues: {
      identifier: '',
      name: '',
      gitHandle: '',
      email: '',
      teamNumber: 0,
    },
  });
  const [error, setError] = useState<string | null>(null);

  const transformStudentData = (data: unknown[]) => {
    const students = data as StudentAndTeamFormUser[];
    return students.map((student: StudentAndTeamFormUser) => ({
      identifier: student.identifier,
      name: student.name,
      gitHandle: student.gitHandle || '',
      email: student.email,
      teamNumber: student.teamNumber,
    }));
  };

  const handleSubmitForm = async () => {
    const response = await fetch(apiRoute, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            identifier: form.values.identifier,
            name: form.values.name,
            gitHandle: form.values.gitHandle,
            email: form.values.email,
            teamNumber: form.values.teamNumber,
          },
        ],
      }),
    });

    await response.json();
    onStudentCreated();
  };

  return (
    <Box maw={300} mx="auto">
      {error && (
        <Notification title="Error" color="red" onClose={() => setError(null)}>
          {error}
        </Notification>
      )}
      <Divider label="Enter Details" size="lg" />
      <form onSubmit={form.onSubmit(handleSubmitForm)}>
        <TextInput
          withAsterisk
          label="Student Name"
          {...form.getInputProps('name')}
          value={form.values.name}
          onChange={event => {
            form.setFieldValue('name', event.currentTarget.value);
          }}
        />
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
          label="Email"
          {...form.getInputProps('email')}
          value={form.values.email}
          onChange={event => {
            form.setFieldValue('email', event.currentTarget.value);
          }}
        />
        <TextInput
          label="Git Handle"
          {...form.getInputProps('gitHandle')}
          value={form.values.gitHandle}
          onChange={event => {
            form.setFieldValue('gitHandle', event.currentTarget.value);
          }}
        />
        <TextInput
          label="Team Number"
          {...form.getInputProps('team')}
          value={form.values.teamNumber}
          onChange={event => {
            form.setFieldValue('teamNumber', +event.currentTarget.value);
          }}
        />
        <Button type="submit" style={{ marginTop: '16px' }}>
          Create Student
        </Button>
      </form>
      <Divider label="or Upload CSV" size="lg" />
      <CSVUpload
        headers={csvTemplateHeaders}
        onProcessComplete={onStudentCreated}
        onError={setError}
        filename="students_template.csv"
        uploadButtonString="Upload Students"
        urlString={apiRoute}
        transformFunction={transformStudentData}
      />
    </Box>
  );
};

export default StudentAndTeamForm;
