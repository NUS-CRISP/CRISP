import RepositoryInfo from '@/components/views/RepositoryInfo';
import { hasFacultyPermission } from '@/lib/auth/utils';
import { Container } from '@mantine/core';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const RepositoryListPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query as {
    id: string;
  };

  const apiRoute = `/api/courses/${id}/repositories`;
  // const apiRouteAccountStatus = '/api/accounts/status';

  const [repositories, setRepositories] = useState<string[]>([]);

  const permission = hasFacultyPermission();

  const onUpdate = () => {
    fetchRepositories();
  };

  useEffect(() => {
    if (router.isReady) {
      fetchRepositories();
    }
  }, [router.isReady]);

  const fetchRepositories = async () => {
    try {
      const response = await fetch(apiRoute, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Error fetching repositories:', response.statusText);
      } else {
        const data = await response.json();
        const { repositories } = data;
        setRepositories(repositories);
      }
    } catch (error) {
      console.error('Error fetching repositories:', error);
    }
  };

  return (
    <Container>
      {id && (
        <RepositoryInfo
          courseId={id}
          repositories={repositories}
          hasFacultyPermission={permission}
          onUpdate={onUpdate}
        />
      )}
    </Container>
  );
};

export default RepositoryListPage;
