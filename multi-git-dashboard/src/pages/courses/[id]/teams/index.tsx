import TeamsInfo from '@/components/views/TeamsInfo';
import { hasFacultyPermission } from '@/lib/auth/utils';
import { Container } from '@mantine/core';
import { TeamSet } from '@shared/types/TeamSet';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { User } from '@shared/types/User';
import { TeamData } from '@shared/types/TeamData';

const TimelineListPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query as {
    id: string;
  };

  const teamSetsApiRoute = `/api/courses/${id}/teamsets`;
  const teachingTeamApiRoute = `/api/courses/${id}/teachingteam`;
  const teamDatasApiRoute = `/api/github/course/${id}/names`;

  const [teamSets, setTeamSets] = useState<TeamSet[]>([]);
  const [teachingTeam, setTeachingTeam] = useState<User[]>([]);
  const [teamDatas, setTeamDatas] = useState<TeamData[]>([]);

  const permission = hasFacultyPermission();

  const onUpdate = () => {
    fetchTeamSets();
    fetchTeachingTeam();
    fetchTeamDatas();
  };

  useEffect(() => {
    if (router.isReady) {
      fetchTeamSets();
      fetchTeachingTeam();
      fetchTeamDatas();
    }
  }, [router.isReady]);

  const fetchTeamSets = async () => {
    try {
      const response = await fetch(teamSetsApiRoute);
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

  const fetchTeachingTeam = async () => {
    try {
      const response = await fetch(teachingTeamApiRoute);
      if (!response.ok) {
        console.error('Error fetching Teaching Team:', response.statusText);
        return;
      }
      const data = await response.json();
      setTeachingTeam(data);
    } catch (error) {
      console.error('Error fetching Teaching Team:', error);
    }
  };

  const fetchTeamDatas = async () => {
    try {
      const response = await fetch(teamDatasApiRoute);
      if (!response.ok) {
        console.error('Error fetching team datas:', response.statusText);
        return;
      }
      const data = await response.json();
      setTeamDatas(data);
    } catch (error) {
      console.error('Error fetching team datas:', error);
    }
  };

  return (
    <Container>
      {id && (
        <TeamsInfo
          courseId={id}
          teamSets={teamSets}
          teachingTeam={teachingTeam}
          teamDatas={teamDatas}
          hasFacultyPermission={permission}
          onUpdate={onUpdate}
        />
      )}
    </Container>
  );
};

export default TimelineListPage;
