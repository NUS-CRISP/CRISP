import { hasFacultyPermission } from '@/lib/auth/utils';
import { Button, Container, Group, Modal, Table, Text } from '@mantine/core';
import { Course } from '@shared/types/Course';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import AssessmentCard from '../cards/AssessmentCard';
import AssessmentForm from '../forms/AssessmentForm';
import SheetsDataTable from '../google/SheetsDataTable ';
import { SheetsData } from '@shared/types/SheetsData';

interface AssessmentInfoProps {
  course: Course;
  onUpdate: () => void;
}

const AssessmentInfo: React.FC<AssessmentInfoProps> = ({
  course,
  onUpdate,
}) => {
  const [isCreatingAssessment, setIsCreatingAssessment] = useState(false);
  const [sheetsData, setSheetsData] = useState<SheetsData | null>(null);

  const getSheetsData = async () => {
    try {
      const response = await fetch(`/api/courses/${course._id}/googlesheets`);
      if (!response.ok) {
        throw new Error('Failed to fetch sheets data');
      }
      const data = await response.json();
      setSheetsData(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchNewSheetsData = async () => {
    try {
      const response = await fetch(`/api/courses/${course._id}/googlesheets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          joinOnColumn: 'Student Matric no',
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch new sheets data');
      }
      onUpdate();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    getSheetsData();
  });

  const assessmentCards = course.assessments.map(assessment => (
    <Link
      key={assessment._id}
      style={{ textDecoration: 'none' }}
      href={`/courses/${course._id}/assessments/${assessment._id}`}
      passHref
    >
      <AssessmentCard
        key={assessment._id}
        assessmentType={assessment.assessmentType}
        markType={assessment.markType}
        frequency={assessment.frequency}
        granularity={assessment.granularity}
        teamSetName={assessment.teamSet ? assessment.teamSet.name : null}
        formLink={assessment.formLink}
      />
    </Link>
  ));

  const toggleForm = () => {
    setIsCreatingAssessment(o => !o);
  };

  const handleAssessmentCreated = () => {
    setIsCreatingAssessment(false);
    onUpdate();
  };

  return (
    <Container>
      {hasFacultyPermission() && (
        <Group style={{ marginBottom: '16px', marginTop: '16px' }}>
          <Button onClick={toggleForm}>Create Assessment</Button>
          <Button onClick={fetchNewSheetsData}>Update Sheets Data</Button>
        </Group>
      )}
      <Modal
        opened={isCreatingAssessment}
        onClose={toggleForm}
        title="Create Assessment"
      >
        <AssessmentForm
          teamSets={course.teamSets}
          courseId={course._id.toString()}
          onAssessmentCreated={handleAssessmentCreated}
        />
      </Modal>
      {sheetsData ? (
        <SheetsDataTable data={sheetsData} />
      ) : (
        <Table striped highlightOnHover>
          <tr>
            <Text>No data available</Text>
          </tr>
        </Table>
      )}
      {assessmentCards}
    </Container>
  );
};

export default AssessmentInfo;
