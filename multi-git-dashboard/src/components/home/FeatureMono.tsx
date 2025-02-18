import { Carousel } from '@mantine/carousel';
import {
    Button,
    Grid,
    SimpleGrid,
    Stack,
    Text,
    ThemeIcon,
    Title,
    rem,
    Container,
} from '@mantine/core';
import classes from '@styles/FeatureMono.module.css';
import {
    IconBrandGithub,
    IconFileText,
    IconLayout,
    IconTools,
} from '@tabler/icons-react';
import Autoplay from 'embla-carousel-autoplay';
import { useRouter } from 'next/router';
import { features } from 'process';
import { useRef } from 'react';


const MOCKDATA = [
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
            "CRISP features a clean, intuitive interface designed for efficiency and ease of use. ",
    },
    {
        icon: IconTools,
        title: 'High Customizability',
        description:
            'CRISP is built to be flexible. Tailor it to your specific needs through personal settings.',
    },
];

interface FeatureProps {
    icon: React.FC<any>;
    title: React.ReactNode;
    description: React.ReactNode;
}

export function Feature({ icon: Icon, title, description }: FeatureProps) {
    return (
        <div>
            <ThemeIcon
                size={44}
                radius="md"
                variant="gradient"
                gradient={{ deg: 133, from: 'blue', to: 'cyan' }}
            >
                <Icon size={30} stroke={1.5} color="white" />
            </ThemeIcon>
            <Text mt="sm" mb={7} color="white" >
                {title}
            </Text>
            <Text size="sm" c="dimmed" lh={1.6}>
                {description}
            </Text>
        </div>
    );
}


const FeatureMono: React.FC = () => {

    const features = MOCKDATA.map((feature, index) => <Feature {...feature} key={index} />);

    return (
        <Container className={classes.wrapper}>
            <Title className={classes.title}>Integrate effortlessly with any technology stack</Title>

            <Container size={560} p={0}>
                <Text size="sm" className={classes.description}>
                    {<strong>CRISP</strong>} is a web-base <strong>dashboard</strong> designed to
                    streamline the <strong>management</strong> and <strong>assessment</strong> of
                    large-scale software engineering modules involving multiple teams working across multiple GitHub repositories.

                </Text>
            </Container>

            <SimpleGrid
                mt={60}
                cols={{ base: 1, sm: 2, md: 3 }}
                spacing={{ base: 'xl', md: 50 }}
                verticalSpacing={{ base: 'xl', md: 50 }}
            >
                {features}
            </SimpleGrid>
        </Container>
    );
}

export default FeatureMono;
