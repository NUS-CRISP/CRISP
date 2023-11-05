import { Button, Container, Table } from '@mantine/core';
import { Course } from '@shared/types/Course';
import { useState } from 'react';
import TAForm from '../forms/TAForm';

interface StaffInfoProps {
  course: Course;
  onUpdate: () => void;
}

const StaffInfo: React.FC<StaffInfoProps> = ({ course, onUpdate }) => {
  const [isCreatingTA, setIsCreatingTA] = useState(false);

  const handleTACreated = () => {
    setIsCreatingTA(false);
    onUpdate();
  };

  return (
    <Container>
      {course.TAs && course.TAs.length > 0 && (
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
            {course.TAs.map(TA => (
              <tr key={TA._id}>
                <td>{TA.name}</td>
                <td>{TA.account.email}</td>
                <td>{TA.identifier}</td>
                <td>{TA.gitHandle}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Button
        onClick={() => setIsCreatingTA(!isCreatingTA)}
        style={{ marginTop: '16px' }}
      >
        {isCreatingTA ? 'Cancel' : 'Add TA'}
      </Button>
      {isCreatingTA && (
        <TAForm courseId={course._id} onTACreated={handleTACreated} />
      )}
    </Container>
  );
};

export default StaffInfo;
