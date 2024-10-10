import { Center } from '@mantine/core';
import { CodeAnalysisData } from '@shared/types/CodeAnalysisData';
import { Team as SharedTeam } from '@shared/types/Team';
import { TeamData } from '@shared/types/TeamData';
import { Status } from '@shared/types/util/Status';
import { useEffect, useState } from 'react';

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

  const data = codeAnalysisData.reduce(
    (
      acc: {
        [key: number]: {
          [key: string]: {
            metrics: string[];
            values: string[];
            types: string[];
            domains: string[];
          };
        }[];
      },
      codeData: CodeAnalysisData
    ) => {
      const teamNumber = getTeamNumberByCodeData(codeData.teamId);
      if (teamNumber !== null) {
        if (!acc[teamNumber]) {
          acc[teamNumber] = [];
        }

        acc[teamNumber].push({
          [new Date(codeData.executionTime).toLocaleString()]: {
            metrics: codeData.metrics,
            values: codeData.values,
            types: codeData.types,
            domains: codeData.domains,
          },
        });
      }
      return acc;
    },
    {}
  );

  if (status === Status.Error) return <Center>No data</Center>;

  return (
    <div>
      {Object.keys(data).map(teamNumber => (
        <div key={teamNumber}>
          <h2>Team {teamNumber}</h2>

          {data[Number(teamNumber)].map((entry, index) => {
            const timing = Object.keys(entry)[0];
            const values = entry[timing];

            return (
              <div key={index}>
                <h3>Execution Time: {timing}</h3>
                <ul>
                  <li>Metrics: {JSON.stringify(values.metrics)}</li>
                  <li>Values: {JSON.stringify(values.values)}</li>
                  <li>Types: {JSON.stringify(values.types)}</li>
                  <li>Domains: {JSON.stringify(values.domains)}</li>
                </ul>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default CodeAnalysis;
