import {
  Button,
  Grid,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  rem,
} from '@mantine/core';
import classes from '@styles/Features.module.css';
import {
  IconBrandGithub,
  IconFileText,
  IconLayout,
  IconTools,
} from '@tabler/icons-react';
import { useRouter } from 'next/router';

const features = [
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

const Features: React.FC = () => {
  const router = useRouter();
  // const autoplay = useRef(Autoplay({ delay: 5000 }));

  const items = features.map(feature => (
    <div key={feature.title}>
      <Stack align="center">
        <ThemeIcon
          size={44}
          radius="md"
          variant="gradient"
          gradient={{ deg: 133, from: 'blue', to: 'cyan' }}
        >
          <feature.icon
            style={{ width: rem(26), height: rem(26) }}
            stroke={1.5}
          />
        </ThemeIcon>
        <Text
          fz="lg"
          mt="sm"
          fw={600}
          className={`${classes.description} ${classes.carouselTitle}`}
        >
          {feature.title}
        </Text>
        <Text fz="sm" className={classes.carouselDescription}>
          {feature.description}
        </Text>
      </Stack>
    </div>
  ));

  return (
    <div className={classes.wrapper}>
      <Grid gutter={80} align="center">
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Title className={classes.title} order={2}>
            Features
          </Title>
          <Text className={classes.description} mt={30}>
            {<strong>CRISP</strong>} is a web-base <strong>dashboard</strong>{' '}
            designed to streamline the <strong>management</strong> and{' '}
            <strong>assessment</strong> of large-scale software engineering
            modules involving multiple teams working across multiple GitHub
            repositories.
          </Text>

          <Button
            variant="gradient"
            gradient={{ deg: 133, from: 'blue', to: 'cyan' }}
            size="lg"
            radius="md"
            mt="xl"
            onClick={() => router.push('/auth/register')}
          >
            Get started
          </Button>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 7 }}>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing={30}>
            {items}
          </SimpleGrid>
        </Grid.Col>
      </Grid>
    </div>
  );
};

export default Features;
