import {
  Box,
  Center,
  Paper,
  Stack,
  Text,
  Title,
  ActionIcon,
} from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import classes from '@styles/FeatureCard.module.css';
import ss1 from '@public/ss-1.png';
import ss2 from '@public/ss-2.png';
import ss3 from '@public/ss-3.png';
import ss4 from '@public/ss-4.png';
import ss5 from '@public/ss-5.png';
import viz1 from '@public/viz-1.png';
import viz2 from '@public/viz-2.png';
import viz3 from '@public/viz-3.png';
import viz4 from '@public/viz-4.png';
import viz5 from '@public/viz-5.png';
import ca1 from '@public/ca-1.jpg';
import ca2 from '@public/ca-2.jpg';
import assess1 from '@public/assess-1.png';
import assess2 from '@public/assess-2.png';
import assess3 from '@public/assess-3.png';
import assess4 from '@public/assess-4.png';
import pm1 from '@public/pm-1.png';
import pm2 from '@public/pm-2.png';
import pm3 from '@public/pm-3.png';
import pm4 from '@public/pm-4.png';
import pm5 from '@public/pm-5.png';

const data = [
  {
    images: [ss1.src, ss2.src, ss3.src, ss4.src, ss5.src],
    title: 'Prioritized',
    description:
      'Analyze and rank team contributions with metrics, giving educators clear insight into students productivity and early prevention.',
  },
  {
    images: [viz1.src, viz2.src, viz3.src, viz4.src, viz5.src],
    title: 'Visualized',
    description:
      'Transform data into visual dashboards that reveal team dynamics, knowledge transfer patterns, and bottlenecks in real-time.',
  },
  {
    images: [ca1.src, ca2.src],
    title: 'AI Diagnosed',
    description:
      'Pinpoint critical quality issues with SonarCube diagnostics that combine test coverage metrics, static analysis, and technical debt indicators into actionable insights.',
  },
  {
    images: [assess1.src, assess2.src, assess3.src, assess4.src],
    title: 'Graded',
    description:
      'Evaluate students performance through customizable assessment frameworks for fair and transparent skill evaluation.',
  },
  {
    images: [pm3.src, pm1.src, pm2.src, pm4.src, pm5.src],
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
