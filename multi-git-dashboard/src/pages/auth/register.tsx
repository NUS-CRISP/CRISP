import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
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
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  IconAlertCircle,
  IconGitBranch,
  IconId,
  IconLock,
  IconUser,
  IconAt,
  IconCircleKey,
} from '@tabler/icons-react';
import CrispRole, { CrispRoleType } from '@shared/types/auth/CrispRole';

{
  /* <Button
  variant="subtle"
  color="gray"
  component={Link}
  href="/"
  leftSection={<IconChevronLeft size={18} />}
  styles={{ label: { color: 'var(--mantine-color-gray-4)' } }}
>
  Back
</Button> */
}

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
      {/* Left: just logo + title */}
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

const RegisterForm: React.FC = () => {
  const router = useRouter();
  const form = useForm<{
    identifier: string;
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: CrispRoleType;
  }>({
    initialValues: {
      identifier: '',
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: CrispRole.Normal,
    },
    validate: {
      identifier: (v: string) =>
        v.trim().length >= 3 ? null : 'Insert your unique student ID',
      name: (v: string) =>
        v.trim().length >= 3 ? null : 'Name must be at least 3 chars',
      email: (v: string) => (/^\S+@\S+$/.test(v) ? null : 'Invalid email'),
      password: (v: string) => (v.length >= 8 ? null : 'At least 8 characters'),
      confirmPassword: (v: string, values: any) =>
        v === values.password ? null : 'Passwords do not match',
      role: (v: CrispRoleType) =>
        v === CrispRole.Normal || v === CrispRole.Faculty
          ? null
          : 'Invalid role',
    },
  });

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const onSubmit = async (values: any) => {
    setLoading(true);
    setServerError(null);
    try {
      const resp = await fetch('/api/accounts/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: values.identifier.trim(),
          name: values.name.trim(),
          email: values.email.trim(),
          password: values.password,
          role: values.role,
        }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.error || `Registration failed (${resp.status})`);
      }
      router.push('/auth/signin?success=true');
    } catch (e: any) {
      setServerError(e.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const roleData = [
    { label: 'Student', value: CrispRole.Normal },
    { label: 'Faculty', value: CrispRole.Faculty },
  ];

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      {serverError && (
        <Alert
          mb="md"
          variant="light"
          color="red"
          icon={<IconAlertCircle />}
          withCloseButton
          onClose={() => setServerError(null)}
        >
          {serverError}
        </Alert>
      )}
      <Stack gap="sm">
        <TextInput
          label="Student ID"
          placeholder="e1234567"
          withAsterisk
          leftSection={<IconId size={18} />}
          {...form.getInputProps('identifier')}
        />
        <TextInput
          label="Name"
          placeholder="John Doe"
          withAsterisk
          leftSection={<IconUser size={18} />}
          {...form.getInputProps('name')}
        />
        <TextInput
          label="School Email"
          placeholder="name@u.nus.edu"
          withAsterisk
          leftSection={<IconAt size={18} />}
          {...form.getInputProps('email')}
        />
        <PasswordInput
          label="Password"
          placeholder="At least 8 characters"
          withAsterisk
          leftSection={<IconLock size={18} />}
          {...form.getInputProps('password')}
        />
        <PasswordInput
          label="Confirm password"
          placeholder="Retype password"
          withAsterisk
          leftSection={<IconCircleKey size={18} />}
          {...form.getInputProps('confirmPassword')}
        />
        <div>
          <Text size="sm" fw={600} mb={6}>
            Sign up as
          </Text>
          <SegmentedControl
            fullWidth
            data={roleData}
            {...form.getInputProps('role')}
          />
        </div>
        <Button type="submit" mt="xs" loading={loading}>
          Create account
        </Button>
        <Divider label="or" labelPosition="center" my="sm" />
        {/* TODO: Not implemented yet! Log in with SSO */}
        <Button variant="light" color="gray" type="button" onClick={() => {}}>
          Log in with SSO
        </Button>
      </Stack>
    </form>
  );
};

export default function RegisterPage() {
  return (
    <AuthShell title="Create an account">
      <Text c="dimmed" size="sm" my={5}>
        Already have an account?{' '}
        <Anchor size="sm" component={Link} href="/auth/signin">
          Sign in
        </Anchor>
      </Text>
      <RegisterForm />
    </AuthShell>
  );
}
