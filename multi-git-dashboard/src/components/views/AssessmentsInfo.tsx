import { hasFacultyPermission } from '@/lib/auth/utils';
import { Button, Container, Modal, Text } from '@mantine/core';
import { Course } from '@shared/types/Course';
import Link from 'next/link';
import { useState } from 'react';
import AssessmentCard from '../cards/AssessmentCard';
import AssessmentForm from '../forms/AssessmentForm';
import { fetchDataFromSheets } from '../google/fetchDataFromSheets';
import SheetsDataTable from '../google/SheetsDataTable ';

interface AssessmentInfoProps {
  course: Course;
  onUpdate: () => void;
}

const AssessmentInfo: React.FC<AssessmentInfoProps> = async ({
  course,
  onUpdate,
}) => {
  const [isCreatingAssessment, setIsCreatingAssessment] = useState(false);
  const sheetIds = course.assessments.map(assessment => assessment.sheetID);
  const compiledData = await fetchDataFromSheets(sheetIds, 'Student Matric no');

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
        <Button
          onClick={toggleForm}
          style={{ marginTop: '16px', marginBottom: '16px' }}
        >
          Create Assessment
        </Button>
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
      {compiledData.length > 0 ? (
        <SheetsDataTable data={compiledData} />
      ) : (
        <Text>No data available</Text>
      )}

      {assessmentCards}
    </Container>
  );
};

export default AssessmentInfo;
