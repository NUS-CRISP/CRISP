import { Button, Container, Group, Modal, Table } from '@mantine/core';
import { Course } from '@shared/types/Course';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import StudentForm from '../forms/StudentForm';
import CSVExport from '../csv/CSVExport';

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

  const studentData = course.students.map(student => ({
    identifier: student.identifier,
    name: student.name,
    gitHandle: student.gitHandle,
    //email: student.email,
  }));

  const csvHeaders = ['identifier', 'name', 'gitHandle']; // 'email'];

  const hasPermission = ['admin', 'Faculty member'].includes(userRole);

  return (
    <Container>
      <Group style={{ marginBottom: '16px', marginTop: '16px' }}>
        {hasPermission && <Button onClick={toggleForm}>Add Student</Button>}
        {hasPermission && (
          <CSVExport
            data={studentData}
            headers={csvHeaders}
            filename="students.csv"
          />
        )}
      </Group>

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
