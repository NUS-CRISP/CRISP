import ContactUs from '@/components/home/ContactUs';
import FeatureShowcase from '@/components/home/FeatureShowcase';
import Features from '@/components/home/Features';
import Header from '@/components/home/Header';
import Hero from '@/components/home/Hero';
import { Container } from '@mantine/core';
import classes from '@styles/Home.module.css';

const Home: React.FC = () => (
  <div className={classes.root}>
    <Container size="lg">
      <Header />
      <Hero />
      <Features />
      <FeatureShowcase />
      <ContactUs />
    </Container>
  </div>
);

export default Home;
