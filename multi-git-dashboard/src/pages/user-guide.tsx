import {
  Anchor,
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

const UserGuide: React.FC = () => (
  <div style={{ overflow: 'hidden', minHeight: '100vh' }}>
    <div style={{ background: 'black' }}>
      <Header />
    </div>

    <Container size="lg" py="xl" style={{ background: '#062343', minHeight: '80vh' }}>
      <Stack gap="xl">
        <div>
          <Title order={1} c="white" mb="xs">
            User Guide
          </Title>
          <Text c="gray.4" size="lg">
            Learn how to get started with CRISP and make the most of its
            features.
          </Text>
        </div>

        <Paper p="xl" radius="md" withBorder style={{ borderColor: '#1e3a5f' }}>
          <Title order={2} c="white" mb="md">
            Getting Started
          </Title>
          <Text c="gray.4" mb="md">
            CRISP is a collaborative platform for course management, code
            analysis, and team-based learning. Follow these steps to get
            started:
          </Text>
          <List spacing="sm" c="gray.4">
            <List.Item>
              <strong>Register:</strong> Create an account via the Sign up button
              and wait for admin approval.
            </List.Item>
            <List.Item>
              <strong>Sign in:</strong> Once approved, sign in with your
              credentials to access your dashboard.
            </List.Item>
            <List.Item>
              <strong>Join a course:</strong> Your instructor will add you to a
              course. You can view your assigned courses on the Courses page.
            </List.Item>
          </List>
        </Paper>

        <Paper p="xl" radius="md" withBorder style={{ borderColor: '#1e3a5f' }}>
          <Title order={2} c="white" mb="md">
            Key Features
          </Title>
          <Stack gap="md">
            <div>
              <Title order={3} c="white" size="h4" mb="xs">
                Course Overview
              </Title>
              <Text c="gray.4">
                View course timelines, assessments, and your progress at a
                glance. Navigate between different course views from the
                sidebar.
              </Text>
            </div>
            <div>
              <Title order={3} c="white" size="h4" mb="xs">
                Assessments
              </Title>
              <Text c="gray.4">
                Complete coding assignments, submit your work, and track
                feedback. Internal assessments and peer reviews help reinforce
                your learning.
              </Text>
            </div>
            <div>
              <Title order={3} c="white" size="h4" mb="xs">
                Teams & Repositories
              </Title>
              <Text c="gray.4">
                Collaborate with your team on shared repositories. View PR
                overviews, code analysis results, and team analytics.
              </Text>
            </div>
            <div>
              <Title order={3} c="white" size="h4" mb="xs">
                Timeline
              </Title>
              <Text c="gray.4">
                Stay on track with the course timeline. See upcoming deadlines
                and milestones for all your assessments and deliverables.
              </Text>
            </div>
          </Stack>
        </Paper>

        <Paper p="xl" radius="md" withBorder style={{ borderColor: '#1e3a5f' }}>
          <Title order={2} c="white" mb="md">
            Need Help?
          </Title>
          <Text c="gray.4">
            For technical documentation and setup instructions, see the{' '}
            <Anchor component={Link} href="/dev-guide" c="blue.3">
              Developer Guide
            </Anchor>
            . Contact your instructor or course administrator for
            course-specific questions.
          </Text>
        </Paper>
      </Stack>
    </Container>

    <div style={{ background: '#062343' }}>
      <Footer />
    </div>
  </div>
);

export default UserGuide;
