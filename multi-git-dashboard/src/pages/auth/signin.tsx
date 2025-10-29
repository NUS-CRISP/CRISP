import { logLogin } from '@/lib/auth/utils';
import {
  Alert,
  Anchor,
  Button,
  Center,
  Container,
  Divider,
  Group,
  Paper,
  PasswordInput,
  rem,
  Text,
  TextInput,
  Title,
  Stack,
} from '@mantine/core';
import {
  IconInfoCircle,
  IconGitBranch,
  IconAt,
  IconLock,
} from '@tabler/icons-react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

// CRISP Logo
const BrandBadge: React.FC<{ size?: number }> = ({ size = 46 }) => (
  <div
    style={{
      width: size,
      height: size,
      display: 'grid',
      placeItems: 'center',
      borderRadius: 9999,
      background: 'linear-gradient(135deg,#A855F7,#22D3EE)',
      boxShadow: '0 8px 32px rgba(168,85,247,.25)',
    }}
  >
    <div
      style={{
        background: '#0f172a',
        borderRadius: 9999,
        width: size - 8,
        height: size - 8,
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <IconGitBranch size={size - 16} />
    </div>
  </div>
);

const AuthShell: React.FC<{
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}> = ({ children, title, subtitle }) => (
  <div
    style={{
      minHeight: '100vh',
      background:
        'radial-gradient(1100px 520px at 12% 10%, rgba(100,116,139,.18), transparent), linear-gradient(135deg, #0b1324 0%, #0f172a 35%, #0b1220 100%)',
      color: 'white',
    }}
  >
    <Container
      size={1200}
      px="md"
      py="xl"
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '1.1fr 1fr',
        gap: 'min(6vw, 48px)',
        alignItems: 'center',
      }}
    >
      {/* Left: logo + title */}
      <Stack visibleFrom="sm" h="100%" justify="center" gap="lg">
        <Anchor
          component={Link}
          href="/"
          underline="never"
          c="inherit"
          style={{ display: 'inline-block' }}
        >
          <Group gap="lg">
            <BrandBadge size={100} />
            <div>
              <Title order={1} fw={700} fz={rem(70)}>
                CRISP
              </Title>
              <Text size="lg" c="gray.4">
                Classroom Repository Interaction & Status Platform
              </Text>
            </div>
          </Group>
        </Anchor>
      </Stack>

      {/* Right: glass card */}
      <Center p={{ base: 'lg', md: 'xl' }}>
        <Paper
          shadow="xl"
          radius="xl"
          withBorder
          p={{ base: 'lg', md: 36 }}
          style={{
            width: '100%',
            backdropFilter: 'blur(8px)',
            background: 'rgba(13, 20, 34, 0.72)',
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <Stack gap={0}>
            <Title order={2} fw={800} c="white">
              {title}
            </Title>
            {subtitle && <Text c="gray.4">{subtitle}</Text>}
          </Stack>
          <div style={{ marginTop: 6 }}>{children}</div>
        </Paper>
      </Center>
    </Container>
  </div>
);

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
      logLogin();
      router.push('/courses');
    }
  };

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(''), 5000);
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
            setShowAlert(false);
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
        <Alert variant="light" color="red" icon={<IconInfoCircle />} mb={15}>
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
