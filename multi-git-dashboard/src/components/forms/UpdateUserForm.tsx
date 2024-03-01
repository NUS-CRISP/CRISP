import { Box, Button, Group, Notification, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { User } from '@shared/types/User';
import { useState } from 'react';

interface UpdateUserFormProps {
  user: User | null;
  onUserUpdated: () => void;
}

const UpdateUserForm: React.FC<UpdateUserFormProps> = ({
  user,
  onUserUpdated,
}) => {
  const apiRoute = `/api/user/${user?._id}`;

  const form = useForm({
    initialValues: {
      identifier: user?.identifier || '',
      name: user?.name || '',
      gitHandle: user?.gitHandle || '',
    },
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmitForm = async () => {
    const requestBody: Record<string, string> = {};

    if (form.values.identifier) {
      requestBody.identifier = form.values.identifier;
    }
    if (form.values.name) {
      requestBody.name = form.values.name;
    }
    requestBody.gitHandle = form.values.gitHandle;

    const response = await fetch(apiRoute, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    await response.json();
    onUserUpdated();
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
          label="Name"
          {...form.getInputProps('name')}
          value={form.values.name}
          onChange={event => {
            form.setFieldValue('name', event.currentTarget.value);
          }}
        />
        <TextInput
          label="ID (NUS Net)"
          {...form.getInputProps('identifier')}
          value={form.values.identifier}
          onChange={event => {
            form.setFieldValue('identifier', event.currentTarget.value);
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
        <Group my={16}>
          <Button type="submit" style={{ marginTop: '16px' }}>
            Update User
          </Button>
        </Group>
      </form>
    </Box>
  );
};

export default UpdateUserForm;
