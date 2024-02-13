import {
  Alert,
  Anchor,
  Button,
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
import { useEffect, useState } from 'react';

const SignInPage: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showAlert, setShowAlert] = useState(!!router.query.success);
  const [error, setError] = useState('');

  useEffect(() => {
    if (showAlert) {
      const timer = setTimeout(() => {
        setShowAlert(false);
        router.push('/auth/signin');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [showAlert, router]);

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
      router.push('/');
    }
  };

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(''), 5000);
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center">Welcome back!</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Don't have an account yet?{' '}
        <Anchor size="sm" component={Link} href="/auth/register">
          Create account
        </Anchor>
      </Text>
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        {router.query.success && (
          <Alert
            variant="light"
            color="green"
            withCloseButton
            onClose={() => {
              setShowAlert(false);
              router.push('/auth/signin');
            }}
            icon={<IconInfoCircle />}
            mb={15}
          >
            Account created successfully! Please wait for your account to be
            approved.
          </Alert>
        )}
        {error && (
          <Alert variant="light" color="red" icon={<IconInfoCircle />} mb={15}>
            {error}
          </Alert>
        )}
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
            {/* <Checkbox label="Remember me" /> */}
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
