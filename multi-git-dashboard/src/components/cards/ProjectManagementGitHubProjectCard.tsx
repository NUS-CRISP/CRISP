import { Group, Stack, Text } from '@mantine/core';
import { GitHubProject } from '@shared/types/GitHubProjectData';
import { TeamData } from '@shared/types/TeamData';
import { User } from '@shared/types/User';

interface ProjectManagementGitHubCardProps {
  TA: User | null;
  gitHubProject: GitHubProject | null;
  teamData: TeamData | null;
}

const ProjectManagementGitHubProjectCard: React.FC<
  ProjectManagementGitHubCardProps
> = ({ TA, gitHubProject, teamData }) => {

  const getMilestoneTitle = (teamData: TeamData) => {
    const openMilestone = teamData.milestones.find(milestone => milestone.state === 'open');
    return (
      <Text>{openMilestone ? openMilestone.title : 'None'}</Text>
    );
  };

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
      {teamData && gitHubProject && (<>
        <Group style={{ alignItems: 'center' }}>
        <Text>Current Milestone:</Text>
        {getMilestoneTitle(teamData)}
      </Group>
      </>)
}
    </Stack>
  );
};

export default ProjectManagementGitHubProjectCard;
