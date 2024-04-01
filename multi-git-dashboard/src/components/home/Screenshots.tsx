import { Center, Grid, Image, Stack, Title } from '@mantine/core';
import ss1 from '@public/ss-1.png';
import ss2 from '@public/ss-2.png';
import ss3 from '@public/ss-3.png';
import ss4 from '@public/ss-4.png';
import classes from '@styles/Screenshots.module.css';
import NextImage from 'next/image';
import React, { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';

const Screenshots: React.FC = () => {
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

  const screenshots = [
    {
      key: 'ss1',
      src: ss1,
      cols: 4.3,
    },
    {
      key: 'ss2',
      src: ss2,
      cols: 7.7,
    },
    {
      key: 'ss3',
      src: ss3,
      cols: 8.2,
    },
    {
      key: 'ss4',
      src: ss4,
      cols: 3.8,
    },
  ];

  return (
    <Stack mt={50} mb={100} gap="lg" ref={ref}>
      <Center>
        <Title
          className={`${classes.title} ${inView ? classes.fadeIn : classes.initialState}`}
        >
          Screenshots
        </Title>
      </Center>
      <Grid>
        {screenshots.map((ss, idx) => (
          <Grid.Col key={ss.key} span={{ base: 12, xs: ss.cols }}>
            <Image
              component={NextImage}
              src={ss.src}
              width={0}
              height={0}
              sizes="100vw"
              alt={ss.key}
              radius="md"
              className={`${classes.initialState} ${animated[idx] ? classes.fadeIn : ''}`}
              style={{
                animationDelay: `${idx * 100}ms`,
                width: '100%',
                height: 'auto',
              }}
            />
          </Grid.Col>
        ))}
      </Grid>
    </Stack>
  );
};

export default Screenshots;
