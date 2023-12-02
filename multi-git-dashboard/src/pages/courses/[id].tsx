import AssessmentsInfo from '@/components/views/AssessmentsInfo';
import MilestonesInfo from '@/components/views/MilestonesInfo';
import Overview from '@/components/views/Overview';
import SprintsInfo from '@/components/views/SprintsInfo';
import StaffInfo from '@/components/views/StaffInfo';
import StudentsInfo from '@/components/views/StudentsInfo';
import TeamSetsInfo from '@/components/views/TeamSetsInfo';
import { getApiUrl } from '@/lib/apiConfig';
import { Container, Loader, Tabs } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Course, Milestone, Sprint } from '@shared/types/Course';
import { TeamData } from '@shared/types/TeamData';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';

const CourseViewPage: React.FC = () => {
  const router = useRouter();
  const id = router.query.id as string;
  const newCourse = router.query.new === 'true';
  const [course, setCourse] = useState<Course>();
  const [teamsData, setTeamsData] = useState<TeamData[]>([]);
  const courseApiUrl = getApiUrl() + `/courses/${id}`;

  useEffect(() => {
    if (newCourse) {
      notifications.show({
        title: 'Course created',
        message: 'Course created successfully',
      });
    }
  }, [newCourse]);

  const fetchCourse = useCallback(async () => {
    try {
      const response = await fetch(courseApiUrl);
      if (!response.ok) {
        console.error('Error fetching course:', response.statusText);
        return;
      }
      const data: Course = await response.json();
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

      if (data.courseType === 'GitHubOrg' && data.gitHubOrgName) {
        fetchTeamDataForOrg(data.gitHubOrgName);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    }
  }, [id]);

  const fetchTeamDataForOrg = async (orgName: string) => {
    try {
      const githubOrgApiUrl = getApiUrl() + `/github/${orgName}`;
      const response = await fetch(githubOrgApiUrl);
      if (!response.ok) {
        console.error('Error fetching team data:', response.statusText);
        return;
      }
      const data = await response.json();
      console.log(orgName);
      console.log('Team data:', data);
      setTeamsData(data.teamDatas);
    } catch (error) {
      console.error('Error fetching team data:', error);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCourse();
    }
  }, [id, fetchCourse]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const deleteCourse = async () => {
    try {
      const response = await fetch(courseApiUrl, {
        method: 'DELETE',
      });
      if (!response.ok) {
        console.error('Error deleting course:', response.statusText);
        return;
      }
      router.push('/courses');
    } catch (error) {
      console.error('Error deleting course:', error);
    }
  };

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
