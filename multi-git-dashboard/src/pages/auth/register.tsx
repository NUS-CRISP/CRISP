import {
  TextInput,
  PasswordInput,
  Anchor,
  Paper,
  Title,
  Text,
  Container,
  Button,
  SegmentedControl,
  Alert,
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import Link from 'next/link';
import router from 'next/router';
import { useState } from 'react';

const roles = ['Faculty member', 'Teaching assistant'];
const backendPort = process.env.BACKEND_PORT || 3001;

const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({
    passwordMismatch: false,
    registerError: null,
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrors({ ...errors, passwordMismatch: true });
      return;
    } else {
      setErrors({ ...errors, passwordMismatch: false });
    }

    const response = await fetch(
      `http://localhost:${backendPort}/api/accounts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, identifier, email, password }),
      }
    );

    if (response.ok) {
      router.push('/auth/signin?success=true');
    } else {
      const { error } = await response.json();
      setErrors({ ...errors, registerError: error });
    }
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
        <form onSubmit={handleSignIn}>
          <TextInput
            label="Name"
            placeholder="Name"
            value={name}
            onChange={event => setName(event.currentTarget.value)}
            required
          />
          <TextInput
            label="Identifier"
            placeholder="Identifier"
            value={identifier}
            onChange={event => setIdentifier(event.currentTarget.value)}
            required
          />
          <TextInput
            label="Email"
            placeholder="Email"
            value={email}
            onChange={event => setEmail(event.currentTarget.value)}
            required
          />
          <PasswordInput
            label="Password"
            placeholder="Password"
            value={password}
            onChange={event => setPassword(event.currentTarget.value)}
            required
            mt="md"
          />
          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={event => setConfirmPassword(event.currentTarget.value)}
            required
            mt="md"
          />
          {errors.passwordMismatch && (
            <Text c="red">Passwords do not match</Text>
          )}
          <Text size="sm" fw={500} mt="md">
            Are you signing up as a:
          </Text>
          <SegmentedControl data={roles} />
          <Button type="submit" fullWidth mt="xl">
            Register
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default RegisterPage;
