import { TeamData } from '@shared/types/TeamData';
import { useEffect, useState } from 'react';
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { AnalyticsProps } from '../Analytics';

interface OverallActivityProps extends Omit<AnalyticsProps, 'team'> {}

export interface OverallActivityChartData {
  commits: number;
  issues: number;
  pullRequests: number;
}

const OverallActivity: React.FC<OverallActivityProps> = ({
  teamData,
  teamDatas,
}) => {
  const [cohortAverages, setCohortAverages] =
    useState<OverallActivityChartData>({
      commits: 0,
      issues: 0,
      pullRequests: 0,
    });

  const data = [
    {
      metric: 'Commits',
      team: teamData.commits,
      cohort: cohortAverages.commits,
    },
    {
      metric: 'Issues',
      team: teamData.issues,
      cohort: cohortAverages.issues,
    },
    {
      metric: 'Pull Requests',
      team: teamData.pullRequests,
      cohort: cohortAverages.pullRequests,
    },
  ];

  const getCohortAverages = (
    fetchedTeamDatas: TeamData[]
  ): OverallActivityChartData => {
    const res = {
      commits: 0,
      issues: 0,
      pullRequests: 0,
    };

    if (fetchedTeamDatas.length === 0) {
      return res;
    }

    const totals = fetchedTeamDatas.reduce((acc, teamData) => {
      acc.commits += teamData.commits;
      acc.issues += teamData.issues;
      acc.pullRequests += teamData.pullRequests;
      return acc;
    }, res);

    return {
      commits: Math.floor(totals.commits / fetchedTeamDatas.length),
      issues: Math.floor(totals.issues / fetchedTeamDatas.length),
      pullRequests: Math.floor(totals.pullRequests / fetchedTeamDatas.length),
    };
  };

  useEffect(() => {
    setCohortAverages(getCohortAverages(teamDatas));
  }, [teamDatas]);

  return (
    <div>
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="metric" />
          <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} />
          <Radar
            name="Team"
            dataKey="team"
            stroke="#8884d8"
            fill="#8884d8"
            fillOpacity={0.6}
          />
          <Radar
            name="Cohort Average"
            dataKey="cohort"
            stroke="#82ca9d"
            fill="#82ca9d"
            fillOpacity={0.6}
          />
          <Legend />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default OverallActivity;
