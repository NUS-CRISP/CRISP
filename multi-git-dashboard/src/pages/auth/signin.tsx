import AuthShell from '@/components/auth/AuthShell';
import { logLogin } from '@/lib/auth/utils';
import {
  Alert,
  Anchor,
  Button,
  Divider,
  PasswordInput,
  Text,
  TextInput,
  Stack,
} from '@mantine/core';
import { IconInfoCircle, IconAt, IconLock } from '@tabler/icons-react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';

const SignInPage: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      showError(res.error);
    } else {
      logLogin();
      router.push('/courses');
    }
  };

  const showError = (message: string) => {
    setError(message);
  };

  return (
    <AuthShell title="Welcome back!" subtitle="">
      <Text c="dimmed" size="sm" my={5}>
        Don't have an account yet?{' '}
        <Anchor size="sm" component={Link} href="/auth/register">
          Create an account
        </Anchor>
      </Text>
      {router.query.success && (
        <Alert
          variant="light"
          color="green"
          withCloseButton
          onClose={() => {
            router.push('/auth/signin');
          }}
          icon={<IconInfoCircle />}
          mb={15}
        >
          <Text c="white">Account created successfully!</Text>
          <Text c="white">Please wait for admin approval.</Text>
        </Alert>
      )}
      {error && (
        <Alert
          variant="light"
          color="red"
          icon={<IconInfoCircle />}
          mb={15}
          withCloseButton
          onClose={() => {
            setError('');
            router.push('/auth/signin');
          }}
        >
          <Text c="white">{error}</Text>
        </Alert>
      )}
      <form onSubmit={handleSignIn}>
        <Stack gap="sm">
          <TextInput
            label="Email"
            placeholder="name@u.nus.edu"
            withAsterisk
            leftSection={<IconAt size={18} />}
            value={email}
            onChange={event => setEmail(event.currentTarget.value)}
            required
          />
          <PasswordInput
            label="Password"
            placeholder="Your password"
            withAsterisk
            leftSection={<IconLock size={18} />}
            value={password}
            onChange={event => setPassword(event.currentTarget.value)}
            required
          />
          {/* TODO: forgot password not implemented yet! */}
          <Anchor href="#" size="sm">
            Forgot password?
          </Anchor>
          <Button type="submit" mt="xs">
            Sign in
          </Button>
          <Divider label="or" labelPosition="center" my="sm" />
          {/* TODO: Not implemented yet! Log in with SSO */}
          <Button variant="light" color="gray" type="button" onClick={() => {}}>
            Log in with SSO
          </Button>
        </Stack>
      </form>
    </AuthShell>
  );
};

export default SignInPage;
