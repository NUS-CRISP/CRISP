import ContactUs from '@/components/home/ContactUs';
import Features from '@/components/home/Features';
import Header from '@/components/home/Header';
import Hero from '@/components/home/Hero';
import Screenshots from '@/components/home/Screenshots';
import { Container } from '@mantine/core';
import classes from '@styles/Home.module.css';

const Home: React.FC = () => (
  <div className={classes.root}>
    <Container size="lg">
      <Header />
      <Hero />
      <Features />
      <Screenshots />
      <ContactUs />
    </Container>
  </div>
);


export default Home;
