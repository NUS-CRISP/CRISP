import { Accordion, ScrollArea } from '@mantine/core';
import { TeamData } from '@shared/types/TeamData';
import { useEffect, useState } from 'react';
import OverviewCard from '../overview/OverviewCard';

interface OverviewProps {
  courseId: string;
}

const Overview: React.FC<OverviewProps> = ({ courseId }) => {
  const getTeamDatas = async () => {
    const res = await fetch(`/api/github/course/${courseId}`);
    if (!res.ok) throw new Error('Failed to fetch team data');
    const teamDatas: TeamData[] = await res.json();
    return teamDatas;
  };

  const [teamDatas, setTeamDatas] = useState<TeamData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedTeamDatas = await getTeamDatas();
        setTeamDatas(fetchedTeamDatas);
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, [courseId]);

  if (teamDatas.length === 0) {
    return <div>No teams found</div>;
  }

  return (
    <ScrollArea.Autosize>
      <Accordion defaultValue={[teamDatas[0]._id]} multiple>
        {teamDatas.map(teamData => (
          <Accordion.Item key={teamData._id} value={teamData._id}>
            <Accordion.Control>{teamData.repoName}</Accordion.Control>
            <Accordion.Panel>
              <OverviewCard teamData={teamData} teamDatas={teamDatas} />
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </ScrollArea.Autosize>
  );
};

export default Overview;
