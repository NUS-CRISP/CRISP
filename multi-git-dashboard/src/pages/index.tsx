import ContactUs from '@/components/home/ContactUs';
import FeatureShowcase from '@/components/home/FeatureShowcase';
import Features from '@/components/home/Features';
import FeatureCard from '@/components/home/FeatureCard';
import Footer from '@/components/home/Footer';
import Header from '@/components/home/Header';
import Hero from '@/components/home/Hero';
import FeatureMono from '@/components/home/FeatureMono';
import AssessmentCard from '@/components/home/AssessmentCard';
import { Container } from '@mantine/core';
import classes from '@styles/Home.module.css';

const Home: React.FC = () => (
  <div style={{ overflow: 'hidden' }}>
    <div style={{ background: 'black' }}>
      <Header />
      <Hero />
    </div>

    <FeatureMono />

    <div style={{ background: '#062343' }}>
      <Container>
        <div style={{ marginBottom: '200px' }}>
          <FeatureCard />
        </div>

        <ContactUs />

        <Footer />
      </Container>
    </div>
  </div>
);

export default Home;
