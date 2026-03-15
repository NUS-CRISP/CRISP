import Footer from '@/components/home/Footer';
import Header from '@/components/home/Header';
import {
  Anchor,
  Container,
  List,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import Link from 'next/link';
import Markdown, { type Components } from 'react-markdown';

type GuidePageProps = {
  title: string;
  description: string;
  markdown: string;
};

const markdownComponents: Components = {
  h2: ({ children }) => (
    <Title order={2} c="white" mb="md" mt="xl">
      {children}
    </Title>
  ),
  h3: ({ children }) => (
    <Title order={3} c="white" size="h4" mb="xs" mt="lg">
      {children}
    </Title>
  ),
  p: ({ children }) => (
    <Text c="gray.4" mb="md">
      {children}
    </Text>
  ),
  ul: ({ children }) => (
    <List spacing="sm" c="gray.4" mb="md">
      {children}
    </List>
  ),
  ol: ({ children }) => (
    <List type="ordered" spacing="sm" c="gray.4" mb="md">
      {children}
    </List>
  ),
  li: ({ children }) => <List.Item>{children}</List.Item>,
  a: ({ href, children }) => {
    if (href?.startsWith('/')) {
      return (
        <Anchor component={Link} href={href} c="blue.3">
          {children}
        </Anchor>
      );
    }

    return (
      <Anchor href={href} c="blue.3" target="_blank" rel="noreferrer">
        {children}
      </Anchor>
    );
  },
  code: ({ children }) => (
    <code
      style={{
        background: '#0b2d4f',
        borderRadius: '4px',
        color: '#dbe7f5',
        padding: '0.1rem 0.35rem',
      }}
    >
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <Paper
      p="sm"
      radius="md"
      withBorder
      mb="md"
      style={{
        background: '#041a31',
        borderColor: '#1e3a5f',
        overflowX: 'auto',
      }}
    >
      {children}
    </Paper>
  ),
};

const GuidePage: React.FC<GuidePageProps> = ({ title, description, markdown }) => (
  <div style={{ overflow: 'hidden', minHeight: '100vh' }}>
    <div style={{ background: 'black' }}>
      <Header />
    </div>

    <Container size="lg" py="xl" style={{ background: '#062343', minHeight: '80vh' }}>
      <Stack gap="xl">
        <div>
          <Title order={1} c="white" mb="xs">
            {title}
          </Title>
          <Text c="gray.4" size="lg">
            {description}
          </Text>
        </div>

        <Paper p="xl" radius="md" withBorder style={{ borderColor: '#1e3a5f' }}>
          <Markdown components={markdownComponents}>{markdown}</Markdown>
        </Paper>
      </Stack>
    </Container>

    <div style={{ background: '#062343' }}>
      <Footer />
    </div>
  </div>
);

export default GuidePage;
