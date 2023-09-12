import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Course } from '@/types/course';
import { Container, Loader, Button, Tabs } from '@mantine/core';
import StudentForm from '@/components/forms/StudentForm';
import CourseInfo from '@/components/CourseView/CourseInfo';
import StudentsInfo from '@/components/CourseView/StudentsInfo';
import TeamsInfo from '@/components/CourseView/TeamsInfo';

const backendPort = process.env.BACKEND_PORT || 3001;
const apiUrl = `http://localhost:${backendPort}/api/courses/`;


const CourseViewPage: React.FC = () => {
  const router = useRouter();
  const id = router.query.id as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCourse();
    }
  }, [id]);

  const fetchCourse = async () => {
    try {
      const response = await fetch(`${apiUrl}${id}`);
      if (response.ok) {
        const data = await response.json();
        setCourse(data);
      } else {
        console.error('Error fetching course:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    }
  };

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

  const handleStudentCreated = () => {
    fetchCourse();
    setShowForm(false);
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
            <Tabs.Tab value="sprints">Sprints</Tabs.Tab>
            <Tabs.Tab value="milestones">Timeline</Tabs.Tab>
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
              <StudentsInfo students={course.students} />
              <div>
                <Button onClick={() => setShowForm(!showForm)} style={{ marginTop: '16px' }}>
                  {showForm ? 'Cancel' : 'Add Student'}
                </Button>
                {showForm && <StudentForm courseId={id} onStudentCreated={handleStudentCreated} />}
              </div>
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

/*
<Tabs.Panel value="teams">
  <div>
    <TeamsInfo teamSets={course.teamSets} />
  </div>
</Tabs.Panel>
*/