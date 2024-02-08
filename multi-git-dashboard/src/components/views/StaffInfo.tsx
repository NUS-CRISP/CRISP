import { Button, Container, Modal, Table } from '@mantine/core';
import { Course } from '@shared/types/Course';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import TAForm from '../forms/TAForm';

interface StaffInfoProps {
  course: Course;
  onUpdate: () => void;
}

const StaffInfo: React.FC<StaffInfoProps> = ({ course, onUpdate }) => {
  const [isCreatingTA, setIsCreatingTA] = useState(false);

  const { data: session } = useSession();
  const userRole = session?.user?.role;

  const toggleForm = () => {
    setIsCreatingTA(o => !o);
  };

  const handleTACreated = () => {
    setIsCreatingTA(false);
    onUpdate();
  };

  const hasPermission = ['admin', 'Faculty member'].includes(userRole || '');

  return (
    <Container>
      {hasPermission && (
        <Button
          onClick={toggleForm}
          style={{ marginTop: '16px', marginBottom: '16px' }}
        >
          {isCreatingTA ? 'Cancel' : 'Add TA'}
        </Button>
      )}
      <Modal opened={isCreatingTA} onClose={toggleForm} title="Add TA">
        <TAForm courseId={course._id} onTACreated={handleTACreated} />
      </Modal>
      {course.TAs && course.TAs.length > 0 && (
        <Table>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Name</th>
              <th style={{ textAlign: 'left' }}>ID</th>
              <th style={{ textAlign: 'left' }}>Git Handle</th>
            </tr>
          </thead>
          <tbody>
            {course.TAs.map(TA => (
              <tr key={TA._id}>
                <td style={{ textAlign: 'left' }}>{TA.name}</td>
                <td style={{ textAlign: 'left' }}>{TA.identifier}</td>
                <td style={{ textAlign: 'left' }}>{TA.gitHandle}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );
};

export default StaffInfo;
