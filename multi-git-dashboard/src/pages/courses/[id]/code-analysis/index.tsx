/* Deprecated page, everything is now within the team-analytics/[teamName].tsx page */
import CodeAnalysis from '@/components/views/deprecated/CodeAnalysis';
import { Container } from '@mantine/core';
import { useRouter } from 'next/router';

const CodeAnalysisPage: React.FC = () => {
  const router = useRouter();
  const { query } = router;
  const courseId = query.id as string;

  return (
    <Container>
      <CodeAnalysis courseId={courseId} />
    </Container>
  );
};

export default CodeAnalysisPage;
