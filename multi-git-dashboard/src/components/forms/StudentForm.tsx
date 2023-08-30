import React from 'react';
import { Box, TextInput, Button } from '@mantine/core';
import { useForm } from '@mantine/form';

const backendPort = process.env.BACKEND_PORT || 3001;

interface StudentFormProps {
  courseId: string | string[] | undefined;
  onStudentCreated: () => void;
}

const StudentForm: React.FC<StudentFormProps> = ({ courseId, onStudentCreated }) => {

  const form = useForm({
    initialValues: {
      name: '',
      _id: '',
      email: '',
      teamNumber: '',
      gitHandle: ''
    },
  });

  const handleSubmit = async () => {

    console.log('Sending student data:', form.values);

    const response = await fetch(`http://localhost:${backendPort}/api/courses/${courseId}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([form.values]),
    });

    const data = await response.json();
    console.log('Student created:', data);
    onStudentCreated();
  };

  return (
    <Box maw={300} mx="auto">
      <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            withAsterisk
            label="Student Name"
            {...form.getInputProps('name')}
            value={form.values.name}
            onChange={(event) => {
              form.setFieldValue('name', event.currentTarget.value);
            }}
          />
          <TextInput
            withAsterisk
            label="Student ID"
            {...form.getInputProps('_id')}
            value={form.values._id}
            onChange={(event) => {
              form.setFieldValue('_id', event.currentTarget.value);
            }}
          />
          <TextInput
            withAsterisk
            label="Student Email"
            {...form.getInputProps('email')}
            value={form.values.email}
            onChange={(event) => {
              form.setFieldValue('email', event.currentTarget.value);
            }}
          />
          <TextInput
            label="Team Number"
            {...form.getInputProps('teamNumber')}
            value={form.values.teamNumber}
            onChange={(event) => {
              form.setFieldValue('teamNumber', event.currentTarget.value);
            }}
          />
          <TextInput
            label="Git Handle"
            {...form.getInputProps('gitHandle')}
            value={form.values.gitHandle}
            onChange={(event) => {
              form.setFieldValue('gitHandle', event.currentTarget.value);
            }}
          />
        <Button type="submit">Create Student</Button>
      </form>
    </Box>
  );
};

export default StudentForm;