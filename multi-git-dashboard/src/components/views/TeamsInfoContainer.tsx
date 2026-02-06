import TeamsInfo from '@/components/views/TeamsInfo';
import { hasFacultyPermission } from '@/lib/auth/utils';
import { TeamSet } from '@shared/types/TeamSet';
import { JiraBoard } from '@shared/types/JiraData';
import { TeamData } from '@shared/types/TeamData';
import { User } from '@shared/types/User';
import { useEffect, useState } from 'react';

interface TeamsInfoContainerProps {
  courseId: string;
}

const TeamsInfoContainer: React.FC<TeamsInfoContainerProps> = ({
  courseId,
}) => {
  const teamSetsApiRoute = `/api/courses/${courseId}/teamsets`;
  const teachingTeamApiRoute = `/api/courses/${courseId}/teachingteam`;
  const teamDatasApiRoute = `/api/github/course/${courseId}/names`;
  const jiraBoardsApiRoute = `/api/jira/course/${courseId}/names`;

  const [teamSets, setTeamSets] = useState<TeamSet[]>([]);
  const [teachingTeam, setTeachingTeam] = useState<User[]>([]);
  const [teamDatas, setTeamDatas] = useState<TeamData[]>([]);
  const [jiraBoards, setJiraBoards] = useState<JiraBoard[]>([]);

  const permission = hasFacultyPermission();

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

  const fetchJiraBoards = async () => {
    try {
      const response = await fetch(jiraBoardsApiRoute);
      if (!response.ok) {
        console.error('Error fetching Jira boards:', response.statusText);
        return;
      }
      const data = await response.json();
      setJiraBoards(data);
    } catch (error) {
      console.error('Error fetching Jira boards:', error);
    }
  };

  const onUpdate = () => {
    fetchTeamSets();
    fetchTeachingTeam();
    fetchTeamDatas();
    fetchJiraBoards();
  };

  useEffect(() => {
    if (!courseId) return;
    fetchTeamSets();
    fetchTeachingTeam();
    fetchTeamDatas();
    fetchJiraBoards();
  }, [courseId]);

  return (
    <TeamsInfo
      courseId={courseId}
      teamSets={teamSets}
      teachingTeam={teachingTeam}
      teamDatas={teamDatas}
      jiraBoards={jiraBoards}
      hasFacultyPermission={permission}
      onUpdate={onUpdate}
    />
  );
};

export default TeamsInfoContainer;
