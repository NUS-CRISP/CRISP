import { Group, Stack, Text } from '@mantine/core';
import { GitHubProject } from '@shared/types/GitHubProjectData';
import { User } from '@shared/types/User';

interface ProjectManagementGitHubCardProps {
  TA: User | null;
  gitHubProject: GitHubProject | null;
}

const ProjectManagementGitHubProjectCard: React.FC<
  ProjectManagementGitHubCardProps
> = ({ TA, gitHubProject }) => {
  return (
    <Stack>
      <Group style={{ alignItems: 'center' }}>
        <Text>Teaching Assistant:</Text>
        <Text>{TA ? TA.name : 'None'}</Text>
      </Group>
      <Group style={{ alignItems: 'center' }}>
        <Text>GitHub Project:</Text>
        <Text>{gitHubProject ? gitHubProject.title : 'None'}</Text>
      </Group>
    </Stack>
  );
};

export default ProjectManagementGitHubProjectCard;
