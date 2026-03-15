import GuidePage from '@/components/guides/GuidePage';
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
  <GuidePage
    title="Developer Guide"
    description="Technical documentation for developers working with the CRISP platform."
    markdown={markdown}
  />
);

export default DevGuide;
