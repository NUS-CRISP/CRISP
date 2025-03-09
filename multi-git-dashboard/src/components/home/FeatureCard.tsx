import { Box, Center, Paper, Stack, Text, Title, useMantineTheme } from '@mantine/core';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import classes from '@styles/FeatureCard.module.css';

const data = [
  {
    image: '/ss-6.png',
    title: 'Prioritized',
    description: 'Track, sort and compare team contributions',
  },
  {
    image: '/ss-3.png',
    title: 'Visualized',
    description: 'Monitor code review interactions',
  },
  {
    image: '/ca-1.jpg',
    title: 'Diagnosed',
    description: 'Highlight test coverage and code quality',
  },
  {
    image: '/assess-1.png',
    title: 'Graded',
    description: 'Fully featured assessment system',
  },
];

interface AnimatedPaperProps {
  image: string;
}

const AnimatedPaper: React.FC<AnimatedPaperProps> = ({ image }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect(); // Animate only once when visible
          }
        });
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <Paper
      ref={ref}
      shadow="md"
      p="xl"
      radius="md"
      style={{
        backgroundImage: `url(${image})`,
        width: '60%',
        height: '350px',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: '5px solid #fff', // Frame effect
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(50px)',
        transition: 'all 0.8s ease',
      }}
    />
  );
};

const FeatureCard: React.FC = () => {
  const router = useRouter();
  const theme = useMantineTheme();

  return (
    <Box>
      <Center>
        <Title className={classes.titleOverlay} style={{ marginBottom: '50px', fontFamily: 'Verdana' }}>
          Seamless Multi-Git Management
        </Title>
      </Center>

      {data.map((item, index) => (
        <Box
          key={item.title}
          className={classes.featureContainer}
          style={{
            display: 'flex',
            flexDirection: index % 2 === 0 ? 'row' : 'row-reverse',
            alignItems: 'center',
            gap: '40px',
            marginBottom: '70px',
          }}
        >
          {/* Animated Image Section */}
          <AnimatedPaper image={item.image} />

          {/* Text Section */}
          <Stack style={{ width: '50%' }}>
            <Title order={1} style={{ color: 'white', fontFamily: 'Verdana' }}>
              {item.title}
            </Title>
            <Text style={{ color: 'white', fontFamily: 'Verdana' }}>
              {item.description}
            </Text>
          </Stack>
        </Box>
      ))}
    </Box>
  );
};

export default FeatureCard;
