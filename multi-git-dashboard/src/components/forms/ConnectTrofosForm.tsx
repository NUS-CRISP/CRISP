import { TextInput, Button, Space, NumberInput } from '@mantine/core';
import { useForm } from '@mantine/form';

interface ConnectTrofosFormProps {
  closeModal: () => void; // Define closeModal as a prop
}

const ConnectTrofosForm = ({ closeModal }: ConnectTrofosFormProps) => {
  // Create a form with two fields: apiKey and courseId
  const form = useForm({
    initialValues: {
      apiKey: '',
      courseId: 0,
    },

    // Optional: Add validation for the fields
    validate: {
      apiKey: value => (value.length === 0 ? 'API key is required' : null),
      courseId: value => (value < 0 ? 'This is not a valid Course ID' : null),
    },
  });

  // Function to handle form submission
  const handleSubmit = (values: typeof form.values) => {
    console.log('Form submitted with values:', values);

    // Handle the form submission logic here (e.g., API call)

    // Close the modal after submission
    closeModal();
  };

  return (
    <form onSubmit={form.onSubmit(values => handleSubmit(values))}>
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
