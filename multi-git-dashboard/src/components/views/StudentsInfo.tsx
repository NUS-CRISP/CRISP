import { Button, Container, Modal, Table } from '@mantine/core';
import { Course } from '@shared/types/Course';
import { useState } from 'react';
import StudentForm from '../forms/StudentForm';

interface StudentsInfoProps {
  course: Course;
  onUpdate: () => void;
}

const StudentsInfo: React.FC<StudentsInfoProps> = ({ course, onUpdate }) => {
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);

  const toggleForm = () => {
    setIsCreatingStudent(o => !o);
  };

  const handleStudentCreated = () => {
    setIsCreatingStudent(false);
    onUpdate();
  };

  return (
    <Container>
      <Button
        onClick={toggleForm}
        style={{ marginTop: '16px', marginBottom: '16px' }}
      >
        Add Student
      </Button>
      <Modal
        opened={isCreatingStudent}
        onClose={toggleForm}
        title="Add Student"
      >
        <StudentForm
          courseId={course._id}
          onStudentCreated={handleStudentCreated}
        />
      </Modal>
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
    </Container>
  );
};

export default StudentsInfo;
