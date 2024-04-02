import { Carousel } from '@mantine/carousel';
import {
  Button,
  Grid,
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
import Autoplay from 'embla-carousel-autoplay';
import { useRouter } from 'next/router';
import { useRef } from 'react';

const features = [
  {
    icon: IconBrandGithub,
    title: 'Free and Open Source',
    description:
      'CRISP is entirely free and open source. Visit our GitHub repository to explore, contribute, or customize it to your needs. We welcome all kinds of contributions and feedback!',
  },
  {
    icon: IconFileText,
    title: 'Comprehensive Documentation',
    description:
      'Get up and running with CRISP quickly, thanks to our detailed documentation. From setup to advanced customization, find all the guidance you need to make the most out of CRISP.',
  },
  {
    icon: IconLayout,
    title: 'User-Friendly Interface',
    description:
      "CRISP features a clean, intuitive interface designed for efficiency and ease of use. Whether you're a novice or a seasoned expert, navigating through the software is a breeze.",
  },
  {
    icon: IconTools,
    title: 'High Customizability',
    description:
      'CRISP is built to be flexible. Tailor it to your specific needs through comprehensive settings, customizable UI components, and powerful API integrations, ensuring a perfect fit for your workflow.',
  },
];

const Features: React.FC = () => {
  const router = useRouter();
  const autoplay = useRef(Autoplay({ delay: 5000 }));

  const items = features.map(feature => (
    <Carousel.Slide key={feature.title}>
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
    </Carousel.Slide>
  ));

  return (
    <div className={classes.wrapper}>
      <Grid gutter={80} align="center">
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Title className={classes.title} order={2}>
            Features
          </Title>
          <Text className={classes.description} mt={30}>
            {<strong>CRISP</strong>} is a multi-git classroom management
            solution that allows educators to monitor student progress, create
            assignments, and grade submissions all in one place.
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
          <Carousel
            plugins={[autoplay.current]}
            onMouseEnter={autoplay.current.stop}
            onMouseLeave={autoplay.current.reset}
            loop
            withControls={false}
          >
            {items}
          </Carousel>
        </Grid.Col>
      </Grid>
    </div>
  );
};

export default Features;
