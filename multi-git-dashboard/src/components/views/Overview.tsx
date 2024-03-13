import { Accordion, Center, Loader, ScrollArea } from '@mantine/core';
import { Team as SharedTeam } from '@shared/types/Team';
import { TeamData } from '@shared/types/TeamData';
import { useEffect, useState } from 'react';
import OverviewCard from '../cards/OverviewCard';

interface OverviewProps {
  courseId: string;
}

export interface Team extends Omit<SharedTeam, 'teamData'> {
  teamData: string; // TeamData not populated
}

const Overview: React.FC<OverviewProps> = ({ courseId }) => {
  const getTeams = async () => {
    const res = await fetch(`/api/teams/course/${courseId}`);
    if (!res.ok) throw new Error('Failed to fetch teams');
    const teams: Team[] = await res.json();
    return teams;
  }

  const getTeamDatas = async () => {
    const res = await fetch(`/api/github/course/${courseId}`);
    if (!res.ok) throw new Error('Failed to fetch team data');
    const teamDatas: TeamData[] = await res.json();
    return teamDatas;
  };

  const [teams, setTeams] = useState<Team[]>([]);
  const [teamDatas, setTeamDatas] = useState<TeamData[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading');

  useEffect(() => {
    const fetchData = async () => {
      setStatus('loading');
      try {
        const fetchedTeams = await getTeams();
        setTeams(fetchedTeams);
        const fetchedTeamDatas = await getTeamDatas();
        setTeamDatas(fetchedTeamDatas);
        setStatus('idle');
      } catch (error) {
        setStatus('error');
        console.error(error);
      }
    };

    fetchData();
  }, [courseId]);

  if (status === 'loading') return <Center><Loader /></Center>;
  if (status === 'error') return <Center>No data</Center>;
  if (!teams.length || !teamDatas.length) return <Center>No teams found.</Center>;

  return (
    <ScrollArea.Autosize>
      <Accordion defaultValue={[teamDatas[0]._id]} multiple variant='separated' mx={20}>
        {teamDatas.map(teamData => (
          <Accordion.Item key={teamData._id} value={teamData._id}>
            <Accordion.Control>{teamData.repoName}</Accordion.Control>
            <Accordion.Panel>
              <OverviewCard team={teams.find(team => team.teamData === teamData._id)} teamData={teamData} teamDatas={teamDatas} />
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </ScrollArea.Autosize>
  );
};

export default Overview;
