import {
  TextInput,
  Button,
  Space,
  NumberInput,
  Notification,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';

interface ConnectTrofosFormProps {
  courseId: string;
  closeModal: () => void; // Define closeModal as a prop
}

const ConnectTrofosForm = ({
  courseId,
  closeModal,
}: ConnectTrofosFormProps) => {
  // Create a form with two fields: apiKey and courseId
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      apiKey: '',
      trofosCourseId: 0,
    },

    // Optional: Add validation for the fields
    validate: {
      apiKey: value => (value.length === 0 ? 'API key is required' : null),
      trofosCourseId: value =>
        value < 0 ? 'This is not a valid Course ID' : null,
    },
  });

  // Function to handle form submission
  const handleSubmit = async (values: typeof form.values) => {
    // Handle the form submission logic here (e.g., API call)
    const apiRoute = `/api/courses/${courseId}`;

    try {
      const response = await fetch(apiRoute, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trofos: values,
        }),
      });

      if (!response.ok) {
        console.error('Error connecting with Trofos:', response.statusText);
        setError('Error connecting with Trofos. Please try again.');
        return;
      }

      await response.json();
    } catch (error) {
      console.error('Error connecting with Trofos:', error);
      setError('Error connecting with Trofos. Please try again.');
    }

    // Close the modal after submission
    closeModal();
  };

  return (
    <form onSubmit={form.onSubmit(values => handleSubmit(values))}>
      {error && (
        <Notification title="Error" color="red" onClose={() => setError(null)}>
          {error}
        </Notification>
      )}

      <TextInput
        withAsterisk
        label="Trofos API Key"
        placeholder="Enter your API key"
        {...form.getInputProps('apiKey')}
        mb="16px"
      />

      <NumberInput
        label="Course ID"
        placeholder="Enter the course ID"
        {...form.getInputProps('courseId')}
        mb="16px"
        min={0} // Ensure the course ID is a non-negative number
      />

      <Space h="md" />
      <Button type="submit">Submit</Button>
    </form>
  );
};

export default ConnectTrofosForm;
