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
      id: '',
      email: '',
      gitHandle: ''
    },
    validate: {
      //email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
    }
  });

  const handleSubmit = async () => {

    console.log('Sending student data:', form.values);

    const response = await fetch(`http://localhost:${backendPort}/api/courses/${courseId}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items:  [ {
          id : form.values.id,
          name : form.values.name,
          email : form.values.email,
          gitHandle : form.values.gitHandle,
          role : "student"
        }]})
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
            {...form.getInputProps('id')}
            value={form.values.id}
            onChange={(event) => {
              form.setFieldValue('id', event.currentTarget.value);
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
            label="Git Handle"
            {...form.getInputProps('gitHandle')}
            value={form.values.gitHandle}
            onChange={(event) => {
              form.setFieldValue('gitHandle', event.currentTarget.value);
            }}
          />
        <Button type="submit" style={{ marginTop: '16px' }}>Create Student</Button>
      </form>
    </Box>
  );
};

export default StudentForm;