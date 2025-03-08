import {
  Alert,
  Anchor,
  Button,
  Container,
  Paper,
  PasswordInput,
  SegmentedControl,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import type { Role } from '@shared/types/auth/Role';
import Roles from '@shared/types/auth/Role';
import { IconInfoCircle } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';

interface FormValues {
  identifier: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: Role;
}

const RegisterPage: React.FC = () => {
  const router = useRouter();
  const form = useForm<FormValues>({
    initialValues: {
      identifier: '',
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: Roles.TA,
    },
    validate: {
      identifier: (value: string) =>
        value.trim().length < 3
          ? 'NUSNet ID must be at least 3 characters long'
          : null,
      name: (value: string) =>
        value.trim().length < 3
          ? 'Name must be at least 3 characters long'
          : null,
      email: (value: string) =>
        !/^\S+@\S+$/.test(value) ? 'Invalid email' : null,
      password: (value: string) =>
        value.length < 6 ? 'Password must be at least 6 characters long' : null,
      confirmPassword: (value: string, values: FormValues) =>
        value !== values.password ? 'Passwords do not match' : null,
      role: (value: Role) =>
        !Object.values(Roles).includes(value) ? 'Invalid role' : null,
    },
  });
  const roleData = [Roles.TA, Roles.Faculty];

  const [errors, setErrors] = useState({
    passwordMismatch: false,
    registerError: null,
  });

  const handleRegister = async (values: FormValues) => {
    const apiRoute = '/api/accounts/register';

    const response = await fetch(apiRoute, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const { error } = await response.json();
      setErrors({ ...errors, registerError: error });
      return;
    }

    router.push('/auth/signin?success=true');
  };

  return (
    <Container size={420} my={40}>
      {errors.registerError && (
        <Alert
          variant="light"
          color="red"
          withCloseButton
          onClose={() => setErrors({ ...errors, registerError: null })}
          title="Alert title"
          icon={<IconInfoCircle />}
        >
          {errors.registerError}
        </Alert>
      )}

      <Title ta="center">Create an account</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Already have an account?{' '}
        <Anchor size="sm" component={Link} href="/auth/signin">
          Sign in
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleRegister)}>
          <TextInput
            withAsterisk
            label="NUSNet ID"
            placeholder="e1234567"
            {...form.getInputProps('identifier')}
          />
          <TextInput
            withAsterisk
            label="Name"
            placeholder="John Doe"
            {...form.getInputProps('name')}
            mt="md"
          />
          <TextInput
            withAsterisk
            label="Email"
            placeholder="E-mail"
            {...form.getInputProps('email')}
            mt="md"
          />
          <PasswordInput
            withAsterisk
            label="Password"
            placeholder="Password"
            {...form.getInputProps('password')}
            mt="md"
          />
          <PasswordInput
            withAsterisk
            label="Confirm password"
            placeholder="Confirm password"
            {...form.getInputProps('confirmPassword')}
            mt="md"
          />
          {errors.passwordMismatch && (
            <Text c="red">Passwords do not match</Text>
          )}
          <Text size="sm" fw={500} mt="md">
            Are you signing up as a:
          </Text>
          <SegmentedControl data={roleData} {...form.getInputProps('role')} />
          <Button type="submit" fullWidth mt="xl">
            Register
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default RegisterPage;
