import { Container } from '@mantine/core';
import { GetServerSideProps } from 'next';

const Home: React.FC = () => (
  <Container>
    <h1>Welcome to CRISP</h1>
  </Container>
);

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/courses',
      permanent: true,
    },
  };
};

export default Home;
