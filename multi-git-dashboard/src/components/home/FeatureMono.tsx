import {
  Button,
  SimpleGrid,
  Text,
  ThemeIcon,
  Title,
  Container,
  Box,
  Flex,
} from '@mantine/core';
import classes from '@styles/FeatureMono.module.css';
import {
  IconBrandGithub,
  IconFileText,
  IconLayout,
  IconTools,
} from '@tabler/icons-react';
import PRGraph from '../overview/pr/PRNetwork';
import { useRouter } from 'next/router';

const MOCKDATA = [
  {
    icon: IconBrandGithub,
    title: 'Free and Open Source',
    description:
      'CRISP is entirely free and open source. Visit our GitHub repository to explore, contribute, or customize it.',
  },
  {
    icon: IconFileText,
    title: 'Comprehensive Documentation',
    description:
      'Get up and running with CRISP quickly, thanks to our detailed documentation.',
  },
  {
    icon: IconLayout,
    title: 'User-Friendly Interface',
    description:
      'CRISP features a clean, intuitive interface designed for efficiency and ease of use. ',
  },
  {
    icon: IconTools,
    title: 'High Customizability',
    description:
      'CRISP is built to be flexible. Tailor it to your specific needs through personal settings.',
  },
];

const mockGraphData = {
  nodes: [
    { id: 'Alice' },
    { id: 'Bob' },
    { id: 'Carlos' },
    { id: 'Diana' },
    { id: 'Emma' },
    { id: 'Frank' },
  ],
  edges: [
    { source: 'Alice', target: 'Bob', weight: 8, status: 'approved' },
    { source: 'Bob', target: 'Alice', weight: 5, status: 'changes_requested' },
    { source: 'Alice', target: 'Carlos', weight: 10, status: 'approved' },
    { source: 'Carlos', target: 'Diana', weight: 6, status: 'commented' },
    { source: 'Diana', target: 'Emma', weight: 3, status: 'approved' },
    { source: 'Emma', target: 'Frank', weight: 7, status: 'approved' },
    { source: 'Frank', target: 'Alice', weight: 9, status: 'commented' },
    { source: 'Bob', target: 'Emma', weight: 4, status: 'dismissed' },
    { source: 'Diana', target: 'Bob', weight: 6, status: 'changes_requested' },
    { source: 'Carlos', target: 'Frank', weight: 8, status: 'approved' },
    { source: 'Emma', target: 'Carlos', weight: 5, status: 'commented' },
    { source: 'Emma', target: 'Bob', weight: 6, status: 'changes_requested' },
    { source: 'Diana', target: 'Carlos', weight: 3, status: 'approved' },
    { source: 'Bob', target: 'Frank', weight: 7, status: 'approved' },
    { source: 'Carlos', target: 'Emma', weight: 7, status: 'approved' },
    { source: 'Bob', target: 'Carlos', weight: 3, status: 'dismissed' },
    { source: 'Bob', target: 'Diana', weight: 9, status: 'approved' },
    { source: 'Alice', target: 'Frank', weight: 5, status: 'commented' },
    { source: 'Diana', target: 'Alice', weight: 10, status: 'dismissed' },
    { source: 'Emma', target: 'Diana', weight: 5, status: 'commented' },
    { source: 'Frank', target: 'Diana', weight: 10, status: 'approved' },
    { source: 'Emma', target: 'Alice', weight: 4, status: 'commented' },
  ],
};

interface FeatureProps {
  icon: React.FC<any>;
  title: React.ReactNode;
  description: React.ReactNode;
}

export function Feature({ icon: Icon, title, description }: FeatureProps) {
  return (
    <div>
      <ThemeIcon
        size={44}
        radius="md"
        variant="gradient"
        gradient={{ deg: 133, from: 'blue', to: 'cyan' }}
      >
        <Icon size={30} stroke={1.5} color="white" />
      </ThemeIcon>
      <Text mt="sm" mb={7} color="white">
        {title}
      </Text>
      <Text size="sm" c="dimmed" lh={1.6}>
        {description}
      </Text>
    </div>
  );
}

const FeatureMono: React.FC = () => {
  const features = MOCKDATA.map((feature, index) => (
    <Feature {...feature} key={index} />
  ));
  const router = useRouter();

  return (
    <Box style={{ backgroundColor: 'black', width: '100%', padding: '0' }}>
      <Container className={classes.wrapper} size="lg">
        <Title
          className={classes.title}
          style={{
            fontFamily: 'Verdana',
            color: 'white',
            marginBottom: '30px',
          }}
        >
          A Multi-Repo Git Mastery Platform
        </Title>

        <Flex direction={{ base: 'column', md: 'row' }} align="center" gap="xl">
          <Box
            style={{
              display: 'flex',
              justifyContent: 'center',
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '10px',
              width: '500px',
              height: '500px',
              overflow: 'hidden',
              transform: 'scale(0.7)',
              transformOrigin: 'center',
            }}
          >
            <PRGraph graphData={mockGraphData} />
          </Box>

          <Box
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
            }}
          >
            <Text
              className={classes.description}
              style={{
                fontFamily: 'Verdana',
                fontSize: '18px',
                color: 'white',
                textAlign: 'left',
              }}
            >
              Managing{' '}
              <span style={{ color: '#3498db' }}>
                multiple GitHub repos in SWE courses{' '}
              </span>
              is a headache... Or at least it used to be. CRISP gives educators{' '}
              <span style={{ color: '#3498db' }}>
                real-time AI insights into student code, team progress, and
                project metrics with powerful GitHub visualization, with Jira
                and Trofos integration
              </span>
              . Teachers <span style={{ color: '#3498db' }}>assess</span>{' '}
              faster, students collaborate better - let CRISP transform your
              software engineering classroom!
            </Text>

            <Flex mt="xl" style={{ width: '100%', justifyContent: 'center' }}>
              <Button
                size="lg"
                variant="gradient"
                gradient={{ from: 'blue', to: 'cyan' }}
                radius="md"
                key="getstarted"
                onClick={() => router.push('/auth/register')}
                autoContrast
              >
                Get Started
              </Button>
            </Flex>
          </Box>
        </Flex>

        <SimpleGrid
          mt={60}
          cols={{ base: 1, sm: 2, md: 4 }}
          spacing={{ base: 'xl', md: 30 }}
          verticalSpacing={{ base: 'xl', md: 30 }}
        >
          {features}
        </SimpleGrid>
      </Container>
    </Box>
  );
};

export default FeatureMono;
