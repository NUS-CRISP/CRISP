import {
  Container,
  Stack,
  Anchor,
  Group,
  Title,
  rem,
  Center,
  Paper,
  Text,
} from '@mantine/core';
import Link from 'next/link';
import CrispIcon from '../shared/CrispIcon';

const AuthShell: React.FC<{
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}> = ({ children, title, subtitle }) => (
  <div
    style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0b1220 10%, #cfd7e3 100%)',
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
            <CrispIcon size={100} />
            <div>
              <Title order={1} fw={700} fz={rem(70)}>
                CRISP
              </Title>
              <Text size="lg" c="gray.3">
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
            {subtitle && <Text c="gray.3">{subtitle}</Text>}
          </Stack>
          <div style={{ marginTop: 6 }}>{children}</div>
        </Paper>
      </Center>
    </Container>
  </div>
);

export default AuthShell;
