import { Center, ScrollArea, Accordion, Button, Modal } from '@mantine/core';
import { CodeAnalysisData } from '@shared/types/CodeAnalysisData';
import { Team as SharedTeam } from '@shared/types/Team';
import { TeamData } from '@shared/types/TeamData';
import { Status } from '@shared/types/util/Status';
import { useEffect, useState } from 'react';
import CodeAnalysisAccordianItem from '../code-analysis/CodeAnalysisAccordianItem';
import { hasFacultyPermission } from '@/lib/auth/utils';
import { useDisclosure } from '@mantine/hooks';
import EditAIInsightsConfigForm from '../forms/EditAIInsightsConfigForm';
import { Course } from '@shared/types/Course';

interface CodeAnalysisProps {
  courseId: string;
}

export interface Team extends Omit<SharedTeam, 'teamData'> {
  teamData: string;
}

const CodeAnalysis: React.FC<CodeAnalysisProps> = ({ courseId }) => {
  const [codeAnalysisData, setCodeAnalysisData] = useState<CodeAnalysisData[]>(
    []
  );
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamDatas, setTeamDatas] = useState<TeamData[]>([]);
  const [status, setStatus] = useState<Status>(Status.Loading);
  const permission = hasFacultyPermission();
  const [opened, { open, close }] = useDisclosure(false);
  const [courseData, setCourseData] = useState<Course>();

  const getCodeAnalysisData = async () => {
    const res = await fetch(`/api/codeanalysis/course/${courseId}`);
    if (!res.ok) throw new Error('Failed to fetch code analysis data');
    const codeAnalysisData: CodeAnalysisData[] = await res.json();
    return codeAnalysisData;
  };

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

  const getCourseDatas = async () => {
    const res = await fetch(`/api/courses/${courseId}`);
    if (!res.ok) throw new Error('Failed to fetch course data');
    const courseData: Course = await res.json();
    return courseData;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedTeams = await getTeams();
        setTeams(fetchedTeams);
        const fetchedTeamDatas = await getTeamDatas();
        setTeamDatas(fetchedTeamDatas);
        const codeAnalysisData = await getCodeAnalysisData();
        setCodeAnalysisData(codeAnalysisData);
        setStatus(Status.Idle);
        if (permission) {
          const fetchedCourse = await getCourseDatas();
          setCourseData(fetchedCourse);
        }
      } catch (error) {
        setStatus(Status.Error);
        console.error(error);
      }
    };
    fetchData();
  }, [courseId]);

  const getTeamNumberByCodeData = (codeDataTeamId: number) => {
    const relatedTeamData = teamDatas.find(
      teamData => teamData.teamId === codeDataTeamId
    );
    if (!relatedTeamData) return null;

    const relatedTeam = teams.find(
      team => team.teamData === relatedTeamData._id
    );
    if (!relatedTeam) return null;

    return relatedTeam.number;
  };

  const getAIInsights = (teams: Team[], teamDatas: TeamData[]) => {
    const res = new Map<number, { text: string; date: Date }>();

    const teamDataMap = new Map();
    for (const teamData of teamDatas) {
      teamDataMap.set(teamData._id.toString(), teamData);
    }

    for (const team of teams) {
      const teamData = teamDataMap.get(team.teamData?.toString());

      if (teamData && teamData.aiInsights) {
        res.set(team.number, teamData.aiInsights);
      }
    }

    return res;
  };
  const aiInsights = getAIInsights(teams, teamDatas);

  const data = codeAnalysisData.reduce(
    (
      acc: {
        [teamNo: number]: {
          [executeDate: string]: {
            metrics: string[];
            values: string[];
            types: string[];
            domains: string[];
            metricStats: Map<string, { median: number; mean: number }>;
          };
        };
      },
      codeData: CodeAnalysisData
    ) => {
      const teamNumber = getTeamNumberByCodeData(codeData.teamId);
      if (teamNumber !== null) {
        if (!acc[teamNumber]) {
          acc[teamNumber] = {};
        }

        acc[teamNumber][new Date(codeData.executionTime).toISOString()] = {
          metrics: codeData.metrics,
          values: codeData.values,
          types: codeData.types,
          domains: codeData.domains,
          metricStats:
            codeData.metricStats ||
            new Map<string, { median: number; mean: number }>(),
        };
      }

      return acc;
    },
    {}
  );

  if (status === Status.Error) return <Center>No data</Center>;

  return (
    <ScrollArea.Autosize mt={20} style={{ height: '95vh', overflow: 'auto' }}>
      {permission && (
        <div>
          <Button onClick={open} mt={16} mb={20}>
            Edit AI Insights Config
          </Button>
        </div>
      )}
      <Modal opened={opened} onClose={close} title="Edit AI">
        <EditAIInsightsConfigForm
          courseId={courseId}
          aiInsights={courseData?.aiInsights}
          closeModal={close}
        />
      </Modal>
      <Accordion
        key={Object.keys(data).join(',')}
        multiple
        variant="separated"
        mx={20}
        defaultValue={
          Object.keys(data).length > 0 ? [Object.keys(data)[0].toString()] : []
        }
      >
        {Object.keys(data).map((teamNumber, index) => (
          <CodeAnalysisAccordianItem
            key={teamNumber}
            codeData={data[Number(teamNumber)]}
            teamNumber={Number(teamNumber)}
            aiInsights={aiInsights.get(Number(teamNumber))}
            renderTutorialPopover={index === 0}
          />
        ))}
      </Accordion>
    </ScrollArea.Autosize>
  );
};

export default CodeAnalysis;
