import { DateUtils } from '@/lib/utils';
import { Center, Container, Loader, ScrollArea } from '@mantine/core';
import { Profile } from '@shared/types/Profile';
import { Team as SharedTeam } from '@shared/types/Team';
import { TeamData } from '@shared/types/TeamData';
import { Status } from '@shared/types/util/Status';
import { useEffect, useState } from 'react';
import AllTeams from '../overview/analytics/team/AllTeams';

interface OverviewProps {
  courseId: string;
  dateUtils: DateUtils;
}
export interface Team extends Omit<SharedTeam, 'teamData'> {
  teamData: string; // TeamData not populated
}

export type ProfileGetter = (gitHandle: string) => Promise<Profile>;

const ClassReview: React.FC<OverviewProps> = ({ courseId }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamDatas, setTeamDatas] = useState<TeamData[]>([]);
  const [status, setStatus] = useState<Status>(Status.Loading);

  const getTeams = async () => {
    const res = await fetch(`/api/teams/course/${courseId}`);
    if (!res.ok) throw new Error('Failed to fetch teams');
    const teams: Team[] = await res.json();
    return teams;
  };

  const getTeamDatas = async () => {
    const res = await fetch(`/api/github/course/${courseId}`);
    if (!res.ok) throw new Error('Failed to fetch team data');
    const teamDatas: TeamData[] = await res.json();
    return teamDatas;
  };

  useEffect(() => {
    const fetchData = async () => {
      setStatus(Status.Loading);
      try {
        const fetchedTeams = await getTeams();
        setTeams(fetchedTeams);
        const fetchedTeamDatas = await getTeamDatas();
        setTeamDatas(fetchedTeamDatas);
        setStatus(Status.Idle);
      } catch (error) {
        setStatus(Status.Error);
        console.error(error);
      }
    };

    fetchData();
  }, [courseId]);

  if (status === Status.Loading)
    return (
      <Center>
        <Container mt={40}>
          <Loader />
        </Container>
      </Center>
    );
  if (status === Status.Error) return <Center>No GitHub Data Available</Center>;
  if (!teams.length || !teamDatas.length)
    return <Center>No teams found.</Center>;

  return (
    <ScrollArea
      style={{
        height: '100vh',
        paddingRight: '20px',
        overflowY: 'auto',
        scrollbarWidth: 'thin',
      }}
    >
      <AllTeams teamDatas={teamDatas} />
    </ScrollArea>
  );
};

export default ClassReview;
