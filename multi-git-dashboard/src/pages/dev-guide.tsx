import {
  Anchor,
  Code,
  Container,
  List,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import Header from '@/components/home/Header';
import Footer from '@/components/home/Footer';
import Link from 'next/link';

const DevGuide: React.FC = () => (
  <div style={{ overflow: 'hidden', minHeight: '100vh' }}>
    <div style={{ background: 'black' }}>
      <Header />
    </div>

    <Container size="lg" py="xl" style={{ background: '#062343', minHeight: '80vh' }}>
      <Stack gap="xl">
        <div>
          <Title order={1} c="white" mb="xs">
            Developer Guide
          </Title>
          <Text c="gray.4" size="lg">
            Technical documentation for developers working with the CRISP
            platform.
          </Text>
        </div>

        <Paper p="xl" radius="md" withBorder style={{ borderColor: '#1e3a5f' }}>
          <Title order={2} c="white" mb="md">
            Project Structure
          </Title>
          <Text c="gray.4" mb="md">
            CRISP is a monorepo with the following main components:
          </Text>
          <List spacing="sm" c="gray.4">
            <List.Item>
              <Code>multi-git-dashboard</Code> — Next.js frontend application
            </List.Item>
            <List.Item>
              <Code>backend</Code> — Express.js API server with MongoDB
            </List.Item>
            <List.Item>
              <Code>shared</Code> — Shared TypeScript types and utilities
            </List.Item>
          </List>
        </Paper>

        <Paper p="xl" radius="md" withBorder style={{ borderColor: '#1e3a5f' }}>
          <Title order={2} c="white" mb="md">
            Getting Started (Development)
          </Title>
          <List spacing="sm" c="gray.4">
            <List.Item>
              <strong>Prerequisites:</strong> Node.js (v12+), pnpm, MongoDB
            </List.Item>
            <List.Item>
              <strong>Environment:</strong> Copy <Code>.env.example</Code> to{' '}
              <Code>.env</Code> and configure your variables (database URL,
              GitHub tokens, etc.)
            </List.Item>
            <List.Item>
              <strong>Install:</strong> Run <Code>pnpm install</Code> in the
              project root
            </List.Item>
            <List.Item>
              <strong>Frontend:</strong> Run <Code>pnpm dev</Code> in{' '}
              <Code>multi-git-dashboard</Code> (default port: 3002)
            </List.Item>
            <List.Item>
              <strong>Backend:</strong> Start the Express server in the{' '}
              <Code>backend</Code> directory
            </List.Item>
          </List>
        </Paper>

        <Paper p="xl" radius="md" withBorder style={{ borderColor: '#1e3a5f' }}>
          <Title order={2} c="white" mb="md">
            Architecture
          </Title>
          <Stack gap="md">
            <div>
              <Title order={3} c="white" size="h4" mb="xs">
                Authentication
              </Title>
              <Text c="gray.4">
                NextAuth with Credentials provider. Session-based auth protects
                most routes. Public routes: home, auth, and guide pages.
              </Text>
            </div>
            <div>
              <Title order={3} c="white" size="h4" mb="xs">
                API
              </Title>
              <Text c="gray.4">
                REST API built with Express. Routes are organized by domain
                (accounts, courses, assessments, etc.). MongoDB + Mongoose for
                data persistence.
              </Text>
            </div>
            <div>
              <Title order={3} c="white" size="h4" mb="xs">
                GitHub Integration
              </Title>
              <Text c="gray.4">
                Octokit for GitHub API. Used for repository access, PR data,
                and code analysis. Requires GitHub tokens in environment config.
              </Text>
            </div>
          </Stack>
        </Paper>

        <Paper p="xl" radius="md" withBorder style={{ borderColor: '#1e3a5f' }}>
          <Title order={2} c="white" mb="md">
            Learn More
          </Title>
          <Text c="gray.4">
            For end-user documentation, see the{' '}
            <Anchor component={Link} href="/user-guide" c="blue.3">
              User Guide
            </Anchor>
            . Check the README in each package for more detailed setup
            instructions.
          </Text>
        </Paper>
      </Stack>
    </Container>

    <div style={{ background: '#062343' }}>
      <Footer />
    </div>
  </div>
);

export default DevGuide;
