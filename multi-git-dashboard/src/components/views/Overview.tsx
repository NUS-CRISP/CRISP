import { Container, Flex, ScrollArea, Text } from '@mantine/core';
import { Course } from '@shared/types/Course';
import { TeamData } from '@shared/types/TeamData';
import GithubTeamCard from '../cards/GithubTeamCard';

interface OverviewProps {
  course: Course;
  teamsData: TeamData[];
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
