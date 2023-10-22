import React, { useState } from 'react';
import { Table, Button, Container } from '@mantine/core';
import TAForm from '../forms/TAForm';
import { Course } from '@/types/course';

interface StaffInfoProps {
  course : Course;
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
          {course.TAs.map((TA) => (
            <tr key={TA._id}>
              <td>{TA.name}</td>
              <td>{TA.email}</td>
              <td>{TA.id}</td>
              <td>{TA.gitHandle}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Button onClick={() => setIsCreatingTA(!isCreatingTA)} style={{ marginTop: '16px' }}>
        {isCreatingTA ? 'Cancel' : 'Add TA'}
      </Button>
      {isCreatingTA && 
        <TAForm 
          courseId={course._id} 
          onTACreated={handleTACreated}
        />
      }
    </Container>
  );
};

export default StaffInfo;
