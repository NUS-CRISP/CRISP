import { Center, Grid, Image, Stack, Text, Title } from '@mantine/core';
import ss1 from '@public/ss-1.png';
import ss2 from '@public/ss-2.png';
import ss3 from '@public/ss-3.png';
import ss4 from '@public/ss-4.png';
import ss5 from '@public/ss-5.png';
import ss6 from '@public/ss-6.png';
import classes from '@styles/FeatureShowcase.module.css';
import NextImage, { StaticImageData } from 'next/image';
import React, { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';

interface Screenshot {
  description: string;
  src: StaticImageData;
  cols: number;
}

const FeatureShowcase: React.FC = () => {
  const [animated, setAnimated] = useState<boolean[]>([
    false,
    false,
    false,
    false,
  ]);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.5,
  });

  useEffect(() => {
    if (inView) {
      const timer = setTimeout(() => {
        setAnimated(animated.map(() => true));
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [inView]);

  const screenshots: Screenshot[] = [
    {
      description: 'Track and compare team contributions',
      src: ss1,
      cols: 4.3,
    },
    {
      description: 'Visualize team contribution over time',
      src: ss5,
      cols: 7.7,
    },
    {
      description: 'View entire cohort performance',
      src: ss6,
      cols: 7.3,
    },
    {
      description: 'Compare activity between members',
      src: ss4,
      cols: 3.8,
    },
  ];

  const getTransitionClassName = (idx: number) => ({
    className: `${classes.initialState} ${animated[idx] ? classes.fadeIn : ''}`,
    style: {
      animationDelay: `${idx * 100}ms`,
      width: '100%',
      height: 'auto',
    },
  });

  const getCaption = (idx: number, description: string) => {
    const { className, style } = getTransitionClassName(idx);
    return (
      <Center mt={10} className={className} style={style}>
        <Text c={'white'}>{description}</Text>
      </Center>
    );
  };

  const getScreenshot = (ss: Screenshot, idx: number) => {
    const { className, style } = getTransitionClassName(idx);
    return (
      <Grid.Col key={ss.description} span={{ base: 12, xs: ss.cols }}>
        <Image
          component={NextImage}
          src={ss.src}
          width={0}
          height={0}
          sizes="100vw"
          alt={ss.description}
          radius="md"
          className={className}
          style={style}
        />
        {getCaption(idx, ss.description)}
      </Grid.Col>
    );
  };

  return (
    <Stack mt={50} mb={100} gap="lg" ref={ref}>
      <Center>
        <Title
          className={`${classes.title} ${inView ? classes.fadeIn : classes.initialState}`}
        >
          Feature Showcase
        </Title>
      </Center>
      <Grid>{screenshots.map((ss, idx) => getScreenshot(ss, idx))}</Grid>
    </Stack>
  );
};

export default FeatureShowcase;
