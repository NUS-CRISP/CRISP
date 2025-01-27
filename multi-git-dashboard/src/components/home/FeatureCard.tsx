import { Carousel } from '@mantine/carousel';
import { Button, Center, Paper, Text, Title, useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import classes from '@styles/FeatureCard.module.css';
import ss6 from '@public/ss-6.png';
import { useRouter } from 'next/router';
import { IconArrowRight, IconArrowLeft } from '@tabler/icons-react'

interface CardProps {
    image: string;
    title: string;
    category: string;
}

function Card({ image, title, category }: CardProps) {
    return (
        <div>
            <Paper
                shadow="md"
                p="xl"
                radius="md"
                style={{ backgroundImage: `url(${image})` }}
                className={classes.card}
            >
                <div>
                    {/* <Text className={classes.category} size="xs">
                    {category}
                </Text> */}
                    {/* <Title order={3} className={classes.title}>
                    {title}
                </Title> */}
                </div>
                {/* <Button variant="white" color="dark">
                Read article
            
            </Button> */}

            </Paper>
            <Title order={3} className={classes.titleOverlay}>
                {title}
            </Title>
        </div>
    );
}

const data = [
    {
        image: '/ss-6.png',
        title: 'Track and compare team contributions',
        category: 'nature',
    },
    {
        image: '/ss-5.png',
        title: 'Visualize team contribution over time',
        category: 'beach',
    },
    {
        image: '/ss-3.png',
        title: 'Monitor code review interactions',
        category: 'nature',
    },
    {
        image: '/ss-7.png',
        title: 'Track team issue and milestone performance',
        category: 'nature',
    },
    {
        image: '/ca-1.jpg',
        title: 'SonarQube: test coverage and code quality',
        category: 'nature',
    },
    {
        image: '/ca-2.jpg',
        title: 'Line of coverage and uncovered code',
        category: 'tourism',
    },
    {
        image: '/assess-1.png',
        title: 'Fully featured assessment system',
        category: 'nature',
    },
    {
        image: '/assess-2.png',
        title: 'Create and manage assessments',
        category: 'nature',
    },
];

const FeatureCard: React.FC = () => {
    const router = useRouter();
    const theme = useMantineTheme();
    const mobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
    const slides = data.map((item) => (
        <Carousel.Slide key={item.title} >
            <Card {...item} />
        </Carousel.Slide>
    ));

    return (
        <div>
            <Center>
                <Title
                    className={classes.titleOverlay}
                    style={{ marginBottom: '50px' }}
                >
                    Feature Showcase
                </Title>
            </Center>

            <Carousel
                slideSize={{ base: '100%', sm: '50%' }}
                slideGap={{ base: 2, sm: 'xl' }}
                align="start"
                slidesToScroll={mobile ? 1 : 2}
                controlsOffset="xs"
                controlSize={40}
                loop
                nextControlIcon={<IconArrowRight size={20} />}
                previousControlIcon={<IconArrowLeft size={20} />}
     
            >
                {slides}
            </Carousel>
            
            <div style={{ display: 'flex', justifyContent: 'center' }}>
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
            </div>
        </div>
    );
}

export default FeatureCard;