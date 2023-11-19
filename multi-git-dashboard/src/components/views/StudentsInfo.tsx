import { Button, Container, Table } from '@mantine/core';
import { Course } from '@shared/types/Course';
import { useState } from 'react';
import StudentForm from '../forms/StudentForm';

interface StudentsInfoProps {
  course: Course;
  onUpdate: () => void;
}

const StudentsInfo: React.FC<StudentsInfoProps> = ({ course, onUpdate }) => {
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);

  const handleStudentCreated = () => {
    setIsCreatingStudent(false);
    onUpdate();
  };

  return (
    <Container>
      <Table>
        <thead>
          <tr>
            <th>Name</th>
            <th>ID</th>
            <th>Git Handle</th>
          </tr>
        </thead>
        <tbody>
          {course.students.map(student => (
            <tr key={student._id}>
              <td>{student.name}</td>
              <td>{student.identifier}</td>
              <td>{student.gitHandle}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Button
        onClick={() => setIsCreatingStudent(!isCreatingStudent)}
        style={{ marginTop: '16px' }}
      >
        {isCreatingStudent ? 'Cancel' : 'Add Student'}
      </Button>
      {isCreatingStudent && (
        <StudentForm
          courseId={course._id}
          onStudentCreated={handleStudentCreated}
        />
      )}
    </Container>
  );
};

export default StudentsInfo;
