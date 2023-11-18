import { Box, Button, Notification, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';

interface CourseFormProps {
  onCourseCreated: () => void;
}

const CreateCoursePage: React.FC<CourseFormProps> = ({ onCourseCreated }) => {
  const form = useForm({
    initialValues: {
      name: '',
      code: '',
      semester: '',
    },
  });

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    try {
      const response = await fetch(
        `http://localhost:${process.env.NEXT_PUBLIC_BACKEND_PORT}/api/courses`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(form.values),
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Course created:', data);
        onCourseCreated();
      } else {
        console.error('Error creating course:', error);
        setError('Error creating course. Please try again.');
      }
    } catch (error) {
      console.error('Error creating course:', error);
      setError('Error creating course. Please try again.');
    }
  };

  return (
    <Box maw={300} mx="auto">
      {error && (
        <Notification title="Error" color="red" onClose={() => setError(null)}>
          {error}
        </Notification>
      )}
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput
          withAsterisk
          label="Course Name"
          {...form.getInputProps('name')}
          value={form.values.name}
          onChange={event => {
            form.setFieldValue('name', event.currentTarget.value);
          }}
        />
        <TextInput
          withAsterisk
          label="Course Code"
          {...form.getInputProps('code')}
          value={form.values.code}
          onChange={event => {
            form.setFieldValue('code', event.currentTarget.value);
          }}
        />
        <TextInput
          withAsterisk
          label="Semester"
          {...form.getInputProps('semester')}
          value={form.values.semester}
          onChange={event => {
            form.setFieldValue('semester', event.currentTarget.value);
          }}
        />
        <Button type="submit" style={{ marginTop: '16px' }}>
          Create Course
        </Button>
      </form>
    </Box>
  );
};

export default CreateCoursePage;
