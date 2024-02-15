import { Accordion, ScrollArea } from '@mantine/core';
import { Course } from '@shared/types/Course';
import { TeamData } from '@shared/types/TeamData';
import { useEffect, useState } from 'react';
import GitHubTeamCardNew from '../cards/new-github-card/GitHubTeamCardNew';

interface OverviewProps {
  course: Course;
}

const Overview: React.FC<OverviewProps> = ({ course }) => {
  const getTeamDatas = async () => {
    const res = await fetch(`/api/github/course/${course._id}`);
    const teamDatas: TeamData[] = await res.json();
    return teamDatas;
  };

  const [teamDatas, setTeamDatas] = useState<TeamData[]>([]);
  const [cohortAverages, setCohortAverages] = useState({
    commits: 0,
    issues: 0,
    pullRequests: 0,
  });

  useEffect(() => {
    async function getData() {
      const res = await getTeamDatas();
      setTeamDatas(res);

      // Calculate cohort averages for commits, issues, and PRs
      // TODO: do this in backend instead
      const red = teamDatas.reduce(
        (acc, teamData) => {
          acc.commits += teamData.commits;
          acc.issues += teamData.issues;
          acc.pullRequests += teamData.pullRequests;
          return acc;
        },
        { commits: 0, issues: 0, pullRequests: 0 }
      );
      setCohortAverages({
        commits: Math.floor(red.commits / teamDatas.length),
        issues: Math.floor(red.issues / teamDatas.length),
        pullRequests: Math.floor(red.pullRequests / teamDatas.length),
      });
    }

    getData();
  }, [course._id, teamDatas]);

  if (teamDatas.length === 0) {
    return <div>No teams found</div>;
  }

  return (
    <ScrollArea.Autosize>
      <Accordion defaultValue={teamDatas[0]._id}>
        {teamDatas.map(teamData => (
          <Accordion.Item key={teamData._id} value={teamData._id}>
            <Accordion.Control>{teamData.repoName}</Accordion.Control>
            <Accordion.Panel>
              <GitHubTeamCardNew
                key={teamData._id}
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
