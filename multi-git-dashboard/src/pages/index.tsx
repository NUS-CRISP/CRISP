import ContactUs from '@/components/home/ContactUs';
import FeatureShowcase from '@/components/home/FeatureShowcase';
import Features from '@/components/home/Features';
import FeatureCard from '@/components/home/FeatureCard';
import Footer from '@/components/home/Footer';
import Header from '@/components/home/Header';
import Hero from '@/components/home/Hero';
import FeatureMono from '@/components/home/FeatureMono';
import { Container } from '@mantine/core';
import classes from '@styles/Home.module.css';

const Home: React.FC = () => (
  <div className={classes.root}>
    <Container size="lg">
      <Header />
      <div style={{marginBottom:"180px"}}>
      <Hero />
      </div>
      <FeatureMono />
      {/* <Features /> */}
      <div style={{marginBottom:"150px"}}>
      <FeatureCard />
      </div>
   
      {/* <FeatureShowcase /> */}
      <ContactUs />
      <Footer />
    </Container>
  </div>
);

export default Home;
