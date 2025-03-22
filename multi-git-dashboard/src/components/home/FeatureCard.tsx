import {
  Box,
  Center,
  Paper,
  Stack,
  Text,
  Title,
  useMantineTheme,
  ActionIcon,
} from '@mantine/core';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import classes from '@styles/FeatureCard.module.css';

const data = [
  {
    images: ['/ss-1.png', '/ss-2.png', '/ss-3.png', '/ss-4.png', '/ss-5.png'],
    title: 'Prioritized',
    description:
      'Analyze and rank team contributions with metrics, giving educators clear insight into students productivity and early prevention.',
  },
  {
    images: [
      '/viz-1.png',
      '/viz-2.png',
      '/viz-3.png',
      '/viz-4.png',
      '/viz-5.png',
    ],
    title: 'Visualized',
    description:
      'Transform data into visual dashboards that reveal team dynamics, knowledge transfer patterns, and bottlenecks in real-time.',
  },
  {
    images: ['/ca-1.jpg', '/ca-2.jpg'],
    title: 'AI Diagnosed',
    description:
      'Pinpoint critical quality issues with SonarCube diagnostics that combine test coverage metrics, static analysis, and technical debt indicators into actionable insights.',
  },
  {
    images: [
      '/assess-1.png',
      '/assess-2.png',
      '/assess-3.png',
      '/assess-4.png',
    ],
    title: 'Graded',
    description:
      'Evaluate students performance through customizable assessment frameworks for fair and transparent skill evaluation.',
  },
  {
    images: ['/pm-3.png', '/pm-1.png', '/pm-2.png', '/pm-4.png', '/pm-5.png'],
    title: 'Managed',
    description:
      'Seamlessly bridge development workflows with Jira and Trofos integration, allowing synchronization of tickets, sprints, and milestone tracking across platforms.',
  },
];

interface ImageCarouselProps {
  images: string[];
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
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

  const nextSlide = () => {
    setCurrentIndex(prevIndex => (prevIndex + 1) % images.length);
  };

  const prevSlide = () => {
    setCurrentIndex(
      prevIndex => (prevIndex - 1 + images.length) % images.length
    );
  };

  return (
    <Box
      ref={ref}
      style={{
        position: 'relative',
        width: '60%',
        height: '350px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(50px)',
        transition: 'all 0.8s ease',
      }}
    >
      <Paper
        shadow="md"
        p="xl"
        radius="md"
        style={{
          backgroundImage: `url(${images[currentIndex]})`,
          width: '100%',
          height: '100%',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          border: '5px solid #fff',
        }}
      />

      {images.length > 1 && (
        <>
          <ActionIcon
            className={classes.carouselButton}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              zIndex: 2,
            }}
            onClick={prevSlide}
          >
            <Text
              style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}
            >
              ←
            </Text>
          </ActionIcon>

          <ActionIcon
            className={classes.carouselButton}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              zIndex: 2,
            }}
            onClick={nextSlide}
          >
            <Text
              style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}
            >
              →
            </Text>
          </ActionIcon>

          <Box
            style={{
              position: 'absolute',
              bottom: '15px',
              left: '0',
              right: '0',
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              zIndex: 2,
            }}
          >
            {images.map((_, index) => (
              <Box
                key={index}
                onClick={() => setCurrentIndex(index)}
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor:
                    currentIndex === index
                      ? '#3498db'
                      : 'rgba(52, 152, 219, 0.4)',
                  cursor: 'pointer',
                }}
              />
            ))}
          </Box>
        </>
      )}
    </Box>
  );
};

const FeatureCard: React.FC = () => {
  return (
    <Box>
      <Center>
        <Title
          className={classes.titleOverlay}
          style={{
            marginBottom: '50px',
            fontFamily: 'Verdana',
            paddingTop: '100px',
          }}
        >
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
          <ImageCarousel images={item.images} />

          <Stack style={{ width: '50%' }}>
            <Title order={1} style={{ color: 'white', fontFamily: 'Verdana' }}>
              {item.title}
            </Title>
            <Text style={{ color: '#3498db', fontFamily: 'Verdana' }}>
              {item.description}
            </Text>
          </Stack>
        </Box>
      ))}
    </Box>
  );
};

export default FeatureCard;
