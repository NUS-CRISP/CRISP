import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Course } from '@/types/course';
import { Container, Text, Loader, Table, Button, Tabs } from '@mantine/core';
import StudentForm from '@/components/forms/StudentForm';
import TeamCard from '@/components/TeamCard';

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
        router.push('/courses'); // Redirect to course list page after deletion
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

  const student_rows = course.students.map((student) => (
    <tr key={student._id}>
      <td>{student.name}</td>
      <td>{student.email}</td>
      <td>{student.gitHandle }</td>
    </tr>
  ));

  const teams_rows = course.teams.map((team) => (
    <TeamCard key={team._id} teamNumber={team.teamNumber} assitant={team.assistant} students={team.students} />
  ));

  return (
    <Container size="md" style={{ minHeight: '100vh' }}>
      {course ? (
        <Tabs defaultValue="info">
          <Tabs.List>
            <Tabs.Tab value="info">Course Info</Tabs.Tab>
            <Tabs.Tab value="students">Students</Tabs.Tab>
            <Tabs.Tab value="teams">Teams</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="info">
            <div>
              <Text variant="h1">Course Name: {course.name}</Text>
              <Text variant="h1">Course Code: {course.code}</Text>
              <Text variant="h1">Semester: {course.semester}</Text>
            </div>
            <Button color="red" onClick={deleteCourse}>
              Delete Course
            </Button>
          </Tabs.Panel>
          <Tabs.Panel value="students">
            <div>
              <Table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Git Handle</th>
                  </tr>
                </thead>
                <tbody>{student_rows}</tbody>
              </Table>
              <div>
                <Button onClick={() => setShowForm(!showForm)}>
                  {showForm ? 'Cancel' : 'Add Student'}
                </Button>
                {showForm && <StudentForm courseId={id} onStudentCreated={handleStudentCreated} />}
              </div>
            </div>
          </Tabs.Panel>
          <Tabs.Panel value="teams">
            <div>
            {teams_rows}
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