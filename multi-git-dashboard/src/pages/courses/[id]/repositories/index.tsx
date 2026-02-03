import RepositoryInfo from '@/components/views/RepositoryInfo';
import { hasFacultyPermission } from '@/lib/auth/utils';
import { Container } from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const RepositoryListPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query as {
    id: string;
  };

  const apiRoute = `/api/courses/${id}/repositories`;
  const teamDatasApiRoute = `/api/github/course/${id}/names`;
  // const apiRouteAccountStatus = '/api/accounts/status';

  const [repositories, setRepositories] = useState<string[]>([]);
  const [teamDatas, setTeamDatas] = useState<TeamData[]>([]);

  const permission = hasFacultyPermission();

  const onUpdate = () => {
    fetchRepositories();
    fetchTeamDatas();
  };

  useEffect(() => {
    if (router.isReady) {
      fetchRepositories();
      fetchTeamDatas();
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
  const fetchTeamDatas = async () => {
    try {
      const response = await fetch(teamDatasApiRoute);
      if (!response.ok) {
        console.error('Error fetching team datas:', response.statusText);
        return;
      }
      const data = await response.json();
      console.log(data);

      setTeamDatas(data);
    } catch (error) {
      console.error('Error fetching team datas:', error);
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
          teamDataList={teamDatas}
        />
      )}
    </Container>
  );
};

export default RepositoryListPage;
