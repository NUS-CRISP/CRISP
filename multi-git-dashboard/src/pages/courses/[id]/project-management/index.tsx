import { hasFacultyPermission } from '@/lib/auth/utils';
import { Container } from '@mantine/core';
import { useRouter } from 'next/router';
import ProjectManagementInfo from '@/components/views/ProjectManagementInfo';

const ProjectManagementPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query as {
    id: string;
  };
  const permission = hasFacultyPermission();

  return (
    <Container>
      {id && (
        <ProjectManagementInfo
          courseId={id}
          hasFacultyPermission={permission}
          onUpdate={() => {}}
        />
      )}
    </Container>
  );
};

export default ProjectManagementPage;
