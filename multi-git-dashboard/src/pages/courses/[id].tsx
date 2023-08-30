import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Course } from '@/types/course';
import { Container, Text, Loader, Table, Button } from '@mantine/core';

const backendPort = process.env.BACKEND_PORT || 3001;
const apiUrl = `http://localhost:${backendPort}/api/courses/`;


const CourseViewPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [course, setCourse] = useState<Course | null>(null);

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
      <td>{student.gitHandle}</td>
      <td>{student.teamNumber}</td>
    </tr>
  ));

  return (
    <Container size="md" style={{ minHeight: '100vh' }}>
      <Text variant="h1">Course Name: {course.name}</Text>
      <Text variant="h1">Course Code: {course.code}</Text>
      <Text variant="h1">Semester: {course.semester}</Text>
      <Text variant="h1">Students</Text>
      <Table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>GitHandle</th>
            <th>Team</th>
          </tr>
        </thead>
      <tbody>{student_rows}</tbody>
    </Table>
    <Button color="red" onClick={deleteCourse}>
      Delete Course
    </Button>
    </Container>
  );
};

export default CourseViewPage;