import { GetServerSideProps } from 'next';

const HomePage = () => {
  return null;
};

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/courses',
      permanent: false,
    },
  };
};

export default HomePage;
