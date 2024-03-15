import { Accordion, Center, Loader, ScrollArea } from '@mantine/core';
import { Profile } from '@shared/types/Profile';
import { Team as SharedTeam } from '@shared/types/Team';
import { TeamData } from '@shared/types/TeamData';
import { Status } from '@shared/types/util/Status';
import { useEffect, useState } from 'react';
import OverviewCard from '../cards/OverviewCard';

interface OverviewProps {
  courseId: string;
}

export interface Team extends Omit<SharedTeam, 'teamData'> {
  teamData: string; // TeamData not populated
}

export type ProfileGetter = (gitHandle: string) => Promise<Profile>;

const Overview: React.FC<OverviewProps> = ({ courseId }) => {
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

  const [teams, setTeams] = useState<Team[]>([]);
  const [teamDatas, setTeamDatas] = useState<TeamData[]>([]);
  const [status, setStatus] = useState<Status>(Status.Loading);

  const [studentMap, setStudentMap] = useState<Record<string, Profile>>({});
  const getStudentNameByGitHandle: ProfileGetter = async gitHandle => {
    if (!studentMap[gitHandle]) {
      const res = await fetch(`/api/user/profile?gitHandle=${gitHandle}`);
      if (!res.ok) throw new Error('Failed to fetch profile');
      const profile: Profile = await res.json();
      console.log(profile);
      setStudentMap({ ...studentMap, [gitHandle]: profile });
    }
    return studentMap[gitHandle];
  };

  const data = teamDatas.map(teamData => {
    const team = teams.find(team => team.teamData === teamData._id);
    return { team, teamData };
  });

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
        <Loader />
      </Center>
    );
  if (status === Status.Error) return <Center>No data</Center>;
  if (!teams.length || !teamDatas.length)
    return <Center>No teams found.</Center>;

  return (
    <ScrollArea.Autosize>
      <Accordion
        defaultValue={[teamDatas[0]._id]}
        multiple
        variant="separated"
        mx={20}
      >
        {data.map(({ team, teamData }) => (
          <Accordion.Item key={teamData._id} value={teamData._id}>
            <Accordion.Control>{teamData.repoName}</Accordion.Control>
            <Accordion.Panel>
              {team ? (
                <OverviewCard
                  team={team}
                  teamData={teamData}
                  teamDatas={teamDatas}
                  profileGetter={getStudentNameByGitHandle}
                />
              ) : (
                <Center>No team found.</Center>
              )}
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </ScrollArea.Autosize>
  );
};

export default Overview;
