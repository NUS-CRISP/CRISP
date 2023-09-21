import { useRouter } from 'next/router';
import { useEffect, useState, useCallback } from 'react';
import { Course } from '@/types/course';
import { Container, Loader, Button, Tabs } from '@mantine/core';
import CourseInfo from '@/components/CourseView/CourseInfo';
import StudentsInfo from '@/components/CourseView/StudentsInfo';
import TeamSetsInfo from '@/components/CourseView/TeamSetsInfo';
import MilestonesInfo from '@/components/CourseView/MilestonesInfo';
import SprintsInfo from '@/components/CourseView/SprintsInfo';
import AssessmentsInfo from '@/components/CourseView/AssessmentsInfo';

const backendPort = process.env.BACKEND_PORT || 3001;
const apiUrl = `http://localhost:${backendPort}/api/courses/`;


const CourseViewPage: React.FC = () => {
  const router = useRouter();
  const id = router.query.id as string;
  const [course, setCourse] = useState<Course>();

  const fetchCourse = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}${id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.milestones) {
          data.milestones = data.milestones.map((milestone : any) => ({
            ...milestone,
            dateline: new Date(milestone.dateline),
          }));
        }
        if (data.sprints) {
          data.sprints = data.sprints.map((sprint : any) => ({
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

  useEffect(() => {
    if (id) {
      fetchCourse();
    }
  }, [id, fetchCourse]);

  const deleteCourse = async () => {
    try {
      const response = await fetch(`${apiUrl}${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        router.push('/courses');
      } else {
        console.error('Error deleting course:', response.statusText);
      }
    } catch (error) {
      console.error('Error deleting course:', error);
    }
  };

  const handleUpdate = () => {
    fetchCourse();
  };

  if (!course) {
    return (
      <Container size="md" style={{ minHeight: '100vh' }}>
        <Loader size="md" />
      </Container>
    );
  }

  return (
    <Container size="md" style={{ minHeight: '100vh' }}>
      {course ? (
        <Tabs defaultValue="info">
          <Tabs.List style={{ display: 'flex', justifyContent: 'space-evenly' }}>
            <Tabs.Tab value="info">Course Info</Tabs.Tab>
            <Tabs.Tab value="students">Students</Tabs.Tab>
            <Tabs.Tab value="teams">Teams</Tabs.Tab>
            <Tabs.Tab value="milestones">Timeline</Tabs.Tab>
            <Tabs.Tab value="sprints">Sprints</Tabs.Tab>
            <Tabs.Tab value="assessments">Assessments</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="info">
            <div>
              <CourseInfo course={course} />
            </div >
            <div style={{ position: 'absolute', bottom: '0', left: '57%', transform: 'translateX(-50%)' }}>
            <Button color="red" onClick={deleteCourse}>
              Delete Course
            </Button>
            </div>
          </Tabs.Panel>
          <Tabs.Panel value="students">
            <div>
              <StudentsInfo course={course} onUpdate={handleUpdate}/>
            </div>
          </Tabs.Panel>
          <Tabs.Panel value="teams">
            <div>
              <TeamSetsInfo course={course} onUpdate={handleUpdate}/>
            </div>
          </Tabs.Panel>
          <Tabs.Panel value="milestones">
            <div>
              <MilestonesInfo course={course} onUpdate={handleUpdate}/>
            </div>
          </Tabs.Panel>
          <Tabs.Panel value="sprints">
            <div>
              <SprintsInfo course={course} onUpdate={handleUpdate}/>
            </div>
          </Tabs.Panel>
          <Tabs.Panel value="assessments">
            <div>
              <AssessmentsInfo course={course} onUpdate={handleUpdate}/>
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
