import { hasFacultyPermission } from '@/lib/auth/utils';
import { Container } from '@mantine/core';
import { useRouter } from 'next/router';
import ProjectManagementInfo from '@/components/views/ProjectManagementInfo';
import { useEffect, useState } from 'react';
import { TeamSet } from '@shared/types/TeamSet';

const ProjectManagementPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query as {
    id: string;
  };
  const permission = hasFacultyPermission();
  const teamSetsApiRoute = `/api/courses/${id}/project-management`;

  const [teamSets, setTeamSets] = useState<TeamSet[]>([]);

  const onUpdate = () => {
    fetchTeamSets();
  };

  useEffect(() => {
    if (router.isReady) {
      fetchTeamSets();
    }
  }, [router.isReady]);

  const fetchTeamSets = async () => {
    try {
      const response = await fetch(teamSetsApiRoute);
      if (!response.ok) {
        console.error('Error fetching Team Sets:', response.statusText);
        return;
      }
      const data = await response.json();
      setTeamSets(data);
    } catch (error) {
      console.error('Error fetching Team Sets:', error);
    }
  };

  return (
    <Container>
      {id && (
        <ProjectManagementInfo
          courseId={id}
          teamSets={teamSets}
          hasFacultyPermission={permission}
          onUpdate={onUpdate}
        />
      )}
    </Container>
  );
};

export default ProjectManagementPage;
