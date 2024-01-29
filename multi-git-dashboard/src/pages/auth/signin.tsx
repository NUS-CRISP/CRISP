import {
  Alert,
  Anchor,
  Button,
  Checkbox,
  Container,
  Group,
  Paper,
  PasswordInput,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';

const SignInPage: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn('credentials', {
      email,
      password,
      callbackUrl: '/',
    });
  };

  return (
    <Container size={420} my={40}>
      {router.query.success && (
        <Alert
          variant="light"
          color="green"
          withCloseButton
          onClose={() => router.push('/auth/signin')}
          title="Alert title"
          icon={<IconInfoCircle />}
        >
          Account created successfully! Please wait for your account to be
          approved.
        </Alert>
      )}

      <Title ta="center">Welcome back!</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Do not have an account yet?{' '}
        <Anchor size="sm" component={Link} href="/auth/register">
          Create account
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSignIn}>
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
          <Group justify="space-between" mt="lg">
            <Checkbox label="Remember me" />
            <Anchor href="#" size="sm">
              Forgot password?
            </Anchor>
          </Group>
          <Button type="submit" fullWidth mt="xl">
            Sign in
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default SignInPage;
