import { Center, Grid, Image, Stack, Title } from '@mantine/core';
import classes from '@styles/Screenshots.module.css';
import React, { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';

const Screenshots: React.FC = () => {
  const [animated, setAnimated] = useState<boolean[]>([false, false, false, false]);
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
      imgPath: '/ss-1.png',
      cols: 4.3,
    },
    {
      imgPath: '/ss-2.png',
      cols: 7.7,
    },
    {
      imgPath: '/ss-3.png',
      cols: 8.2,
    },
    {
      imgPath: '/ss-4.png',
      cols: 3.8,
    }
  ];

  return (
    <Stack mt={50} mb={100} gap="lg" ref={ref}>
      <Center>
        <Title className={`${classes.title} ${inView ? classes.fadeIn : classes.initialState}`}>
          Screenshots
        </Title>
      </Center>
      <Grid>
        {screenshots.map((ss, idx) => (
          <Grid.Col key={ss.imgPath} span={{ base: 12, xs: ss.cols }}>
            <Image
              radius="md"
              src={ss.imgPath}
              className={`${classes.initialState} ${animated[idx] ? classes.fadeIn : ''}`}
              style={{ animationDelay: `${idx * 100}ms` }}
            />
          </Grid.Col>
        ))}
      </Grid>
    </Stack>
  );
};

export default Screenshots;
