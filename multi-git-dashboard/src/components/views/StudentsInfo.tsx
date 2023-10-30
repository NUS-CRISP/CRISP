import { Button, Container, Table } from '@mantine/core';
import { Course } from '@shared/types/Course';
import { getTableUser } from '@shared/types/User';
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
      {course.students && course.students.length > 0 && (
        <Table>
          <thead>
            <tr>
              {Object.keys(getTableUser(course.students[0])).map(key => (
                <th>{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {course.students.map(student => (
              <tr key={student._id}>
                {Object.values(getTableUser(student)).map(value => (
                  <td>{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      )}
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
