import { Accordion, ScrollArea } from '@mantine/core';
import { Course } from '@shared/types/Course';
import { TeamData } from '@shared/types/TeamData';
import { useEffect, useState } from 'react';
import GitHubTeamCardNew from '../cards/new-github-card/GitHubTeamCardNew';
import { TeamPolarChartData } from '../cards/new-github-card/TeamCharts';

interface OverviewProps {
  course: Course;
}

// TODO: Move average computation to backend
const getCohortAverages = (
  fetchedTeamDatas: TeamData[]
): TeamPolarChartData => {
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

const Overview: React.FC<OverviewProps> = ({ course }) => {
  const getTeamDatas = async () => {
    const res = await fetch(`/api/github/course/${course._id}`);
    if (!res.ok) throw new Error('Failed to fetch team data');
    const teamDatas: TeamData[] = await res.json();
    return teamDatas;
  };

  const [teamDatas, setTeamDatas] = useState<TeamData[]>([]);
  const [cohortAverages, setCohortAverages] = useState<TeamPolarChartData>({
    commits: 0,
    issues: 0,
    pullRequests: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedTeamDatas = await getTeamDatas();
        const cohortAverages = getCohortAverages(fetchedTeamDatas);
        setTeamDatas(fetchedTeamDatas);
        setCohortAverages(cohortAverages);
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, [course._id]);

  if (teamDatas.length === 0) {
    return <div>No teams found</div>;
  }

  return (
    <ScrollArea.Autosize>
      <Accordion defaultValue={teamDatas[0]?._id.toString()}>
        {teamDatas.map(teamData => (
          <Accordion.Item key={teamData._id} value={teamData._id.toString()}>
            <Accordion.Control>{teamData.repoName}</Accordion.Control>
            <Accordion.Panel>
              <GitHubTeamCardNew
                teamData={teamData}
                cohortAverages={cohortAverages}
              />
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </ScrollArea.Autosize>
  );
};

export default Overview;
