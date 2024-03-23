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
  const jiraRegistrationStatusApiRoute = `/api/courses/${id}/jira-registration-status`;
  const projectManagementApiRoute = `/api/courses/${id}/project-management`;

  const [teamSets, setTeamSets] = useState<TeamSet[]>([]);
  const [jiraRegistrationStatus, setJiraRegistrationStatus] =
    useState<boolean>(false);

  const fetchTeamSets = async () => {
    try {
      const response = await fetch(projectManagementApiRoute);
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

  const fetchJiraRegistrationStatus = async () => {
    try {
      const response = await fetch(jiraRegistrationStatusApiRoute);
      if (!response.ok) {
        console.error(
          'Error fetching Jira registration status:',
          response.statusText
        );
        return;
      }
      const data = await response.json();
      setJiraRegistrationStatus(data);
    } catch (error) {
      console.error('Error fetching Jira registration status:', error);
    }
  };

  const onUpdate = () => {
    fetchTeamSets();
    fetchJiraRegistrationStatus();
  };

  useEffect(() => {
    if (router.isReady) {
      fetchTeamSets();
      fetchJiraRegistrationStatus();
    }
  }, [router.isReady]);

  return (
    <Container>
      {id && (
        <ProjectManagementInfo
          courseId={id}
          teamSets={teamSets}
          jiraRegistrationStatus={jiraRegistrationStatus}
          hasFacultyPermission={permission}
          onUpdate={onUpdate}
        />
      )}
    </Container>
  );
};

export default ProjectManagementPage;
