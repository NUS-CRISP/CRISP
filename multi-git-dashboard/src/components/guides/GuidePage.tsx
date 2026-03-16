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
  useComputedColorScheme,
} from '@mantine/core';
import Link from 'next/link';
import Markdown, { type Components } from 'react-markdown';

type GuidePageProps = {
  title: string;
  description: string;
  markdown: string;
};

const GuidePage: React.FC<GuidePageProps> = ({ title, description, markdown }) => {
  const colorScheme = useComputedColorScheme('light', {
    getInitialValueInEffect: false,
  });
  const isDark = colorScheme === 'dark';

  const markdownComponents: Components = {
    h2: ({ children }) => (
      <Title order={2} c={isDark ? 'white' : 'dark.9'} mb="md" mt="xl">
        {children}
      </Title>
    ),
    h3: ({ children }) => (
      <Title order={3} c={isDark ? 'white' : 'dark.9'} size="h4" mb="xs" mt="lg">
        {children}
      </Title>
    ),
    p: ({ children }) => (
      <Text c={isDark ? 'gray.4' : 'dark.6'} mb="md">
        {children}
      </Text>
    ),
    ul: ({ children }) => (
      <List spacing="sm" c={isDark ? 'gray.4' : 'dark.6'} mb="md">
        {children}
      </List>
    ),
    ol: ({ children }) => (
      <List type="ordered" spacing="sm" c={isDark ? 'gray.4' : 'dark.6'} mb="md">
        {children}
      </List>
    ),
    li: ({ children }) => <List.Item>{children}</List.Item>,
    a: ({ href, children }) => {
      const linkColor = isDark ? 'blue.3' : 'blue.7';

      if (href?.startsWith('/')) {
        return (
          <Anchor component={Link} href={href} c={linkColor}>
            {children}
          </Anchor>
        );
      }

      return (
        <Anchor href={href} c={linkColor} target="_blank" rel="noreferrer">
          {children}
        </Anchor>
      );
    },
    code: ({ children }) => (
      <code
        style={{
          background: isDark ? '#0b2d4f' : '#e9f2ff',
          borderRadius: '4px',
          color: isDark ? '#dbe7f5' : '#0b3d91',
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
          background: isDark ? '#041a31' : '#f5faff',
          borderColor: isDark ? '#1e3a5f' : '#cfe0ff',
          overflowX: 'auto',
        }}
      >
        {children}
      </Paper>
    ),
  };

  return (
    <div style={{ overflow: 'hidden', minHeight: '100vh' }}>
      <div style={{ background: 'black' }}>
        <Header />
      </div>

      <div style={{ background: isDark ? '#062343' : 'var(--mantine-color-gray-0)' }}>
        <Container size="lg" py="xl" style={{ minHeight: '80vh' }}>
          <Stack gap="xl">
            <div>
              <Title order={1} c={isDark ? 'white' : 'dark.9'} mb="xs">
                {title}
              </Title>
              <Text c={isDark ? 'gray.4' : 'dark.6'} size="lg">
                {description}
              </Text>
            </div>

            <Paper
              p="xl"
              radius="md"
              withBorder
              style={{
                background: isDark ? 'var(--mantine-color-dark-7)' : 'white',
                borderColor: isDark
                  ? '#1e3a5f'
                  : 'var(--mantine-color-gray-3)',
              }}
            >
              <Markdown components={markdownComponents}>{markdown}</Markdown>
            </Paper>
          </Stack>
        </Container>

        <Footer />
      </div>
    </div>
  );
};

export default GuidePage;
