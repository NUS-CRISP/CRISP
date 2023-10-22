import React from 'react';
import { Box, TextInput, Button } from '@mantine/core';
import { useForm } from '@mantine/form';

const backendPort = process.env.BACKEND_PORT || 3001;
const apiUrl = `http://${process.env.NEXT_PUBLIC_DOMAIN}:${backendPort}/api/courses`;

interface CourseFormProps {
  onCourseCreated: () => void;
}

const CourseForm: React.FC<CourseFormProps> = ({ onCourseCreated }) => {

  const form = useForm({
    initialValues: {
      name: '',
      code: '',
      semester: '',
    },
  });

  const handleSubmit = async () => {

    console.log('Sending course data:', form.values, 'to:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(form.values),
    });

    const data = await response.json();
    console.log('Course created:', data);
    onCourseCreated();
  };

  return (
    <Box maw={300} mx="auto">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput
          withAsterisk
          label="Course Name"
          {...form.getInputProps('name')}
          value={form.values.name}
          onChange={(event) => {
            form.setFieldValue('name', event.currentTarget.value);
          }}
        />
        <TextInput
          withAsterisk
          label="Course Code"
          {...form.getInputProps('code')}
          value={form.values.code}
          onChange={(event) => {
            form.setFieldValue('code', event.currentTarget.value);
          }}
        />
        <TextInput
          withAsterisk
          label="Semester"
          {...form.getInputProps('semester')}
          value={form.values.semester}
          onChange={(event) => {
            form.setFieldValue('semester', event.currentTarget.value);
          }}
        />
        <Button type="submit" style={{ marginTop: '16px' }}>Create Course</Button>
      </form>
    </Box>
  );
};

export default CourseForm;
