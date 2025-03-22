import {
  Box,
  Paper,
  Stack,
  Title,
  useMantineTheme,
} from '@mantine/core';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import classes from '@styles/FeatureCard.module.css';

const data = [
  {
    image: '/assess-1.png',
    title: 'Fully featured assessment system',
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
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect(); // Trigger animation only once
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
        height: '400px',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: '5px solid #fff', // This creates the frame effect
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(50px)',
        transition: 'all 1.5s ease',
      }}
    />
  );
};

const AssessmentCard: React.FC = () => {
  // const router = useRouter();
  // const theme = useMantineTheme();

  return (
    <Box>
      <div style={{ marginBottom: '250px' }} />
      {data.map((item, index) => (
        <Box
          key={item.title}
          className={classes.featureContainer}
          style={{
            display: 'flex',
            flexDirection: index % 2 === 0 ? 'row' : 'row-reverse',
            alignItems: 'center',
            gap: '40px',
            marginBottom: '50px',
          }}
        >
          {/* Animated Image Section */}
          <AnimatedPaper image={item.image} />

          {/* Text Section */}
          <Stack
            style={{ width: '50%', fontFamily: 'Verdana', color: 'white' }}
          >
            <Title order={3}>{item.title}</Title>
          </Stack>
        </Box>
      ))}
    </Box>
  );
};

export default AssessmentCard;
