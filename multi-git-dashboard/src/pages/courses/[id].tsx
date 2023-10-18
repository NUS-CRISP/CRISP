import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';
import { Course, Milestone, Sprint } from '@/types/course';
import { Container, Loader, Tabs } from '@mantine/core';
import Overview from '@/components/CourseView/Overview';
import StudentsInfo from '@/components/CourseView/StudentsInfo';
import StaffInfo from '@/components/CourseView/StaffInfo';
import TeamSetsInfo from '@/components/CourseView/TeamSetsInfo';
import MilestonesInfo from '@/components/CourseView/MilestonesInfo';
import SprintsInfo from '@/components/CourseView/SprintsInfo';
import AssessmentsInfo from '@/components/CourseView/AssessmentsInfo';
import { ITeamData } from '@backend/models/TeamData';

const backendPort = process.env.BACKEND_PORT || 3001;
const apiUrl = `http://${process.env.NEXT_PUBLIC_DOMAIN}:${backendPort}/api/courses/`;
const teamDataUrl = `http://${process.env.NEXT_PUBLIC_DOMAIN}:${backendPort}/api/github/`;

const CourseViewPage: React.FC = () => {
  const router = useRouter();
  const id = router.query.id as string;
  const [course, setCourse] = useState<Course>();
  const [teamsData, setTeamsData] = useState<ITeamData[]>([]);

  const fetchCourse = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}${id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.milestones) {
          data.milestones = data.milestones.map((milestone: Milestone) => ({
            ...milestone,
            dateline: new Date(milestone.dateline),
          }));
        }
        if (data.sprints) {
          data.sprints = data.sprints.map((sprint: Sprint) => ({
            ...sprint,
            startDate: new Date(sprint.startDate),
            endDate: new Date(sprint.endDate),
          }));
        }
        setCourse(data);
      } else {
        console.error('Error fetching course:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    }
  }, [id]);

  const fetchTeamData = useCallback(async () => {
    try {
      const response = await fetch(teamDataUrl);
      if (response.ok) {
        const data = await response.json();
        const teamsData: ITeamData[] = data.teamData;
        setTeamsData(teamsData);
      } else {
        console.error('Error fetching team data:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchCourse();
      fetchTeamData();
    }
  }, [id, fetchCourse, fetchTeamData]);

  const handleUpdate = () => {
    fetchCourse();
  };

  if (!course) {
    return (
      <Container size="md">
        <Loader size="md" />
      </Container>
    );
  }

  return (
    <Container size="md">
      {course ? (
        <Tabs defaultValue="overview">
          <Tabs.List
            style={{ display: 'flex', justifyContent: 'space-evenly' }}
          >
            <Tabs.Tab value="overview">Overview</Tabs.Tab>
            <Tabs.Tab value="students">Students</Tabs.Tab>
            <Tabs.Tab value="staff">Staff</Tabs.Tab>
            <Tabs.Tab value="teams">Teams</Tabs.Tab>
            <Tabs.Tab value="milestones">Timeline</Tabs.Tab>
            <Tabs.Tab value="sprints">Sprints</Tabs.Tab>
            <Tabs.Tab value="assessments">Assessments</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="overview">
            <div>
              <Overview course={course} teamsData={teamsData} />
            </div>
          </Tabs.Panel>
          <Tabs.Panel value="students">
            <div>
              <StudentsInfo course={course} onUpdate={handleUpdate} />
            </div>
          </Tabs.Panel>
          <Tabs.Panel value="staff">
            <div>
              <StaffInfo course={course} onUpdate={handleUpdate} />
            </div>
          </Tabs.Panel>
          <Tabs.Panel value="teams">
            <div>
              <TeamSetsInfo course={course} onUpdate={handleUpdate} />
            </div>
          </Tabs.Panel>
          <Tabs.Panel value="milestones">
            <div>
              <MilestonesInfo course={course} onUpdate={handleUpdate} />
            </div>
          </Tabs.Panel>
          <Tabs.Panel value="sprints">
            <div>
              <SprintsInfo course={course} onUpdate={handleUpdate} />
            </div>
          </Tabs.Panel>
          <Tabs.Panel value="assessments">
            <div>
              <AssessmentsInfo course={course} onUpdate={handleUpdate} />
            </div>
          </Tabs.Panel>
        </Tabs>
      ) : (
        <Loader size="md" />
      )}
    </Container>
  );
};

export default CourseViewPage;
