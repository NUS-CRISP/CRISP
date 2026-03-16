import GuidePage from '@/components/guides/GuidePage';
import ContactUs from '@/components/home/ContactUs';
import Footer from '@/components/home/Footer';
import { Container } from '@mantine/core';
import { promises as fs } from 'fs';
import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import path from 'path';

type DevGuideProps = {
  markdown: string;
};

export const getStaticProps: GetStaticProps<DevGuideProps> = async () => {
  const markdownPath = path.join(
    process.cwd(),
    'src',
    'content',
    'guides',
    'dev-guide.md'
  );
  const markdown = await fs.readFile(markdownPath, 'utf8');

  return {
    props: {
      markdown,
    },
  };
};

const DevGuide: React.FC<InferGetStaticPropsType<typeof getStaticProps>> = ({
  markdown,
}) => (
  <div>
    <GuidePage
      title="Developer Guide"
      description="Welcome to the CRISP (Classroom Repository Interaction and Status Platform) developer guide. We appreciate your interest in contributing to our project! This guide will help you get started with setting up the project, making changes, and submitting those changes for review."
      markdown={markdown}
    />

    <Container mt="xl">
      <ContactUs />
    </Container>
    <Footer />
  </div>
);

export default DevGuide;
