import { Button, Container, Modal, Table } from '@mantine/core';
import { Course } from '@shared/types/Course';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import StudentForm from '../forms/StudentForm';

interface StudentsInfoProps {
  course: Course;
  onUpdate: () => void;
}

const StudentsInfo: React.FC<StudentsInfoProps> = ({ course, onUpdate }) => {
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);

  const { data: session } = useSession();
  const userRole = session?.user?.role;

  const toggleForm = () => {
    setIsCreatingStudent(o => !o);
  };

  const handleStudentCreated = () => {
    setIsCreatingStudent(false);
    onUpdate();
  };

  const hasPermission = ['admin', 'Faculty member'].includes(userRole);

  return (
    <Container>
      {hasPermission && (
        <Button
          onClick={toggleForm}
          style={{ marginTop: '16px', marginBottom: '16px' }}
        >
          Add Student
        </Button>
      )}
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
            <th style={{ textAlign: 'left' }}>Name</th>
            <th style={{ textAlign: 'left' }}>ID</th>
            <th style={{ textAlign: 'left' }}>Git Handle</th>
          </tr>
        </thead>
        <tbody>
          {course.students.map(student => (
            <tr key={student._id}>
              <td style={{ textAlign: 'left' }}>{student.name}</td>
              <td style={{ textAlign: 'left' }}>{student.identifier}</td>
              <td style={{ textAlign: 'left' }}>{student.gitHandle}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
};

export default StudentsInfo;
