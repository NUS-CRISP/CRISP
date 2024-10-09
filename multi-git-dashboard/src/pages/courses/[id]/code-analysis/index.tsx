import CodeAnalysis from '@/components/views/CodeAnalysis';
import { hasFacultyPermission } from '@/lib/auth/utils';
import { Container } from '@mantine/core';
import { useRouter } from 'next/router';

const CodeAnalysisPage: React.FC = () => {
  const router = useRouter();
  const { pathname, query } = router;
  const { id } = router.query as {
    id: string;
  };
  const permission = hasFacultyPermission();
  const courseId = query.id as string;

  return (
    <Container>
      <CodeAnalysis courseId={courseId} />
    </Container>
  );
};

export default CodeAnalysisPage;
