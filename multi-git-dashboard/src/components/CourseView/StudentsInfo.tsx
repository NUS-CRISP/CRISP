import React, { useState } from 'react';
import { Table, Button, Container } from '@mantine/core';
import StudentForm from '../forms/StudentForm';
import { Course } from '@/types/course';

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
            <th>Email</th>
            <th>ID</th>
            <th>Git Handle</th>
          </tr>
        </thead>
        <tbody>
          {course.students.map(student => (
            <tr key={student._id}>
              <td>{student.name}</td>
              <td>{student.email}</td>
              <td>{student.id}</td>
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
