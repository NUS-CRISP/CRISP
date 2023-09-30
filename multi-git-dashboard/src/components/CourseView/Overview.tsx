import { TeamData } from '@/types/teamdata';
import GithubTeamCard from './Cards/GithubTeamCard';
import { Container, ScrollArea, Text } from '@mantine/core';

interface OverviewProps {
  course: {
    name: string;
    code: string;
    semester: string;
    milestones: any[];
  },
  teamsData: TeamData[]
}

const Overview: React.FC<OverviewProps> = ({ course, teamsData }) => {
  return (
    <Container>
      <Text variant="h1">Course Name: {course.name}</Text>
      <Text variant="h1">Course Code: {course.code}</Text>
      <Text variant="h1">Semester: {course.semester}</Text>
      <ScrollArea h={730}>
        <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {teamsData.map((team, index) => (
            <GithubTeamCard key={index} teamData={team} milestones={course.milestones} />
          ))}
        </div>
      </ScrollArea>
    </Container>
  );
};

export default Overview;