import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Alert,
  Anchor,
  Button,
  Divider,
  PasswordInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  IconAlertCircle,
  IconId,
  IconLock,
  IconUser,
  IconAt,
  IconCircleKey,
} from '@tabler/icons-react';
import { CRISP_ROLE, CrispRole } from '@shared/types/auth/CrispRole';
import AuthShell from '@/components/auth/AuthShell';

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

const RegisterForm: React.FC = () => {
  const router = useRouter();
  type RegisterValues = {
    identifier: string;
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: CrispRole;
  };

  const form = useForm<RegisterValues>({
    initialValues: {
      identifier: '',
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: CRISP_ROLE.Normal,
    },
    validate: {
      identifier: (v: string) =>
        v.trim().length >= 3 ? null : 'Insert your unique student ID',
      name: (v: string) =>
        v.trim().length >= 3 ? null : 'Name must be at least 3 chars',
      email: (v: string) => (/^\S+@\S+$/.test(v) ? null : 'Invalid email'),
      password: (v: string) => (v.length >= 8 ? null : 'At least 8 characters'),
      confirmPassword: (v: string, values: RegisterValues) =>
        v === values.password ? null : 'Passwords do not match',
      role: (v: CrispRole) =>
        v === CRISP_ROLE.Normal || v === CRISP_ROLE.Faculty
          ? null
          : 'Invalid role',
    },
  });

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const onSubmit = async (values: RegisterValues) => {
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
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Registration failed';
      setServerError(message);
    } finally {
      setLoading(false);
    }
  };

  const roleData = [
    { label: 'Student', value: CRISP_ROLE.Normal },
    { label: 'Faculty', value: CRISP_ROLE.Faculty },
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
          <Text c="white">{serverError}</Text>
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
            styles={{
              root: {
                backgroundColor: 'rgba(255,255,255,0.7)',
              },
            }}
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
