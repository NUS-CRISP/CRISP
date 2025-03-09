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
  <div className={classes.root}>
    <Container size="lg">
      <Header />
      <Hero />
    </Container>


    <div style={{ marginTop: "350px" }}>
      <FeatureMono />
    </div>



    {/* <FeatureShowcase /> */}

    <Container size="lg">
      <div style={{ marginBottom: "250px" }}>
        <FeatureCard />
      </div>
      {/* <div style={{ marginBottom: "250px" }}>
        <AssessmentCard />
      </div> */}
      {/* <Features /> */}
      <ContactUs />
      <Footer />
    </Container>
  </div>
);

export default Home;
