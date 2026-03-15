import GuidePage from '@/components/guides/GuidePage';
import { promises as fs } from 'fs';
import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import path from 'path';

type UserGuideProps = {
  markdown: string;
};

export const getStaticProps: GetStaticProps<UserGuideProps> = async () => {
  const markdownPath = path.join(
    process.cwd(),
    'src',
    'content',
    'guides',
    'user-guide.md'
  );
  const markdown = await fs.readFile(markdownPath, 'utf8');

  return {
    props: {
      markdown,
    },
  };
};

const UserGuide: React.FC<InferGetStaticPropsType<typeof getStaticProps>> = ({
  markdown,
}) => (
  <GuidePage
    title="User Guide"
    description="Learn how to get started with CRISP and make the most of its features."
    markdown={markdown}
  />
);

export default UserGuide;
