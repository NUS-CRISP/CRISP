import { DateUtils } from '@/lib/utils';
import {
  Accordion,
  Center,
  Container,
  Loader,
  ScrollArea,
} from '@mantine/core';
import { Profile } from '@shared/types/Profile';
import { Team as SharedTeam } from '@shared/types/Team';
import { TeamData } from '@shared/types/TeamData';
import { Status } from '@shared/types/util/Status';
import { useEffect, useState } from 'react';
import OverviewAccordionItem from '../overview/OverviewAccordionItem';
import { useTutorialContext } from '../tutorial/TutorialContext';
import TutorialPopover from '../tutorial/TutorialPopover';
import AllTeams from '../overview/analytics/team/AllTeams';
import styles from '@styles/root-layout.module.css';

interface OverviewProps {
  courseId: string;
  dateUtils: DateUtils;
}

export interface Team extends Omit<SharedTeam, 'teamData'> {
  teamData: string; // TeamData not populated
}

export type ProfileGetter = (gitHandle: string) => Promise<Profile>;

const Overview: React.FC<OverviewProps> = ({ courseId, dateUtils }) => {
  const { curTutorialStage } = useTutorialContext();

  const [teams, setTeams] = useState<Team[]>([]);
  const [teamDatas, setTeamDatas] = useState<TeamData[]>([]);
  const [status, setStatus] = useState<Status>(Status.Loading);

  const [studentMap, setStudentMap] = useState<Record<string, Profile>>({});

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

  const getStudentNameByGitHandle: ProfileGetter = async gitHandle => {
    if (!studentMap[gitHandle]) {
      const res = await fetch(`/api/user/profile?gitHandle=${gitHandle}`);
      if (!res.ok) throw new Error('Failed to fetch profile');
      const profile: Profile = await res.json();
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
        <Container mt={40}>
          <Loader />
        </Container>
      </Center>
    );
  if (status === Status.Error) return <Center>No GitHub Data Available</Center>;
  if (!teams.length || !teamDatas.length)
    return <Center>No teams found.</Center>;

  return (
    <ScrollArea.Autosize mt={20}>
      <Accordion
        defaultValue={[teamDatas[0]._id]}
        multiple
        variant="separated"
        mx={20}
      >
        <AllTeams
          teamDatas={teamDatas}
        />

        {data.map(({ team, teamData }, idx) => (
          <TutorialPopover
            key={teamData._id}
            stage={7}
            position="left"
            disabled={idx !== 0 || curTutorialStage !== 7}
          >
            <OverviewAccordionItem
              index={idx}
              key={teamData._id}
              team={team}
              teamData={teamData}
              teamDatas={teamDatas}
              dateUtils={dateUtils}
              getStudentNameByGitHandle={getStudentNameByGitHandle}
            />

          </TutorialPopover>
        ))}
      </Accordion>
    </ScrollArea.Autosize>
  );
};

export default Overview;
