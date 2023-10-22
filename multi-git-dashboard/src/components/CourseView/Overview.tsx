import GithubTeamCard from '../CourseView/Cards/GithubTeamCard';
import { Container, Flex, ScrollArea, Text } from '@mantine/core';
import { Milestone } from '@/types/course';
import { ITeamData } from '@backend/models/TeamData';

interface OverviewProps {
  course: {
    name: string;
    code: string;
    semester: string;
    milestones: Milestone[];
  };
  teamsData: ITeamData[];
}

const Overview: React.FC<OverviewProps> = ({ course, teamsData }) => (
  <Flex direction={'column'} h={'100dvh'}>
    <Container>
      <Text variant="h1">Course Name: {course.name}</Text>
      <Text variant="h1">Course Code: {course.code}</Text>
      <Text variant="h1">Semester: {course.semester}</Text>
    </Container>
    <ScrollArea style={{ flex: 1, overflowY: 'auto' }}>
      {teamsData.map((team, index) => (
        <GithubTeamCard
          key={index}
          teamData={team}
          milestones={course.milestones}
          sprints={course.sprints}
        />
      ))}
    </ScrollArea>
  </Flex>
);

export default Overview;
