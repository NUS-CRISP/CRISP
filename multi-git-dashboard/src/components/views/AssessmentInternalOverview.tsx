// components/views/AssessmentInternalOverview.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, Divider, Group, Modal, Text, Title, Box } from '@mantine/core';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import { Submission } from '@shared/types/Submission';
import { useRouter } from 'next/router';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import UpdateAssessmentInternalForm from '../forms/UpdateAssessmentInternalForm';
import SubmissionCard from '../cards/SubmissionCard';
import { QuestionUnion } from '@shared/types/Question';

interface AssessmentInternalOverviewProps {
  courseId: string;
  assessment: InternalAssessment | null;
  hasFacultyPermission: boolean;
  onUpdateAssessment: () => void;
  questions: QuestionUnion[];
  userIdToNameMap: { [key: string]: string }; // Add this
}

const formatDate = (date: Date | string | undefined) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString();
};

const AssessmentInternalOverview: React.FC<AssessmentInternalOverviewProps> = ({
  courseId,
  assessment,
  hasFacultyPermission,
  onUpdateAssessment,
  questions,
  userIdToNameMap,
}) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const router = useRouter();
  const deleteInternalAssessmentApiRoute = `/api/internal-assessments/${assessment?._id}`;

  // Fetch submissions based on user permissions
  const fetchSubmissions = useCallback(async () => {
    if (!assessment) return;

    const apiRoute = hasFacultyPermission
      ? `/api/internal-assessments/${assessment._id}/all-submissions`
      : `/api/internal-assessments/${assessment._id}/submissions`;

    try {
      const response = await fetch(apiRoute, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Error fetching submissions:', response.statusText);
        return;
      }

      let data: Submission[] = await response.json();

      // For faculty, filter out drafts
      if (hasFacultyPermission) {
        data = data.filter((submission) => !submission.isDraft);
      }

      setSubmissions(data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  }, [assessment, hasFacultyPermission]);

  // Delete assessment handler
  const deleteAssessment = async () => {
    try {
      const response = await fetch(deleteInternalAssessmentApiRoute, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to delete assessment');
      }
      router.push(`/courses/${courseId}/assessments`);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Toggle modals
  const toggleEditModal = () => setIsEditModalOpen((o) => !o);
  const toggleDeleteModal = () => setIsDeleteModalOpen((o) => !o);

  // Update handler after editing
  const onUpdate = () => {
    onUpdateAssessment();
    toggleEditModal();
    fetchSubmissions();
  };

  // Fetch submissions on component mount or when dependencies change
  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Handle "Take Assessment" button click
  const handleTakeAssessment = () => {
    router.push(`/courses/${courseId}/internal-assessments/${assessment?._id}/take`);
  };

  return (
    <Box>
      {/* Edit Assessment Modal */}
      <Modal opened={isEditModalOpen} onClose={toggleEditModal} title="Edit Assessment">
        <UpdateAssessmentInternalForm assessment={assessment} onAssessmentUpdated={onUpdate} />
      </Modal>

      {/* Delete Assessment Modal */}
      <Modal opened={isDeleteModalOpen} onClose={toggleDeleteModal} title="Confirm Delete">
        <Text>Are you sure you want to delete this assessment?</Text>
        <Group mt="md" mb="md" p="right">
          <Button variant="default" onClick={toggleDeleteModal}>
            Cancel
          </Button>
          <Button color="red" onClick={deleteAssessment}>
            Delete
          </Button>
        </Group>
      </Modal>

      {/* Assessment Details Card */}
      <Card withBorder shadow="sm" mb="lg">
        <Group p="apart">
          <Box>
            <Title order={2}>{assessment?.assessmentName}</Title>
            <Text c="dimmed">{assessment?.description}</Text>
          </Box>
          {hasFacultyPermission && (
            <Group>
              <Button
                variant="light"
                color="blue"
                onClick={toggleEditModal}
                leftSection={<IconEdit size={16} />}
              >
                Edit
              </Button>
              <Button
                variant="light"
                color="red"
                onClick={toggleDeleteModal}
                leftSection={<IconTrash size={16} />}
              >
                Delete
              </Button>
            </Group>
          )}
        </Group>
        <Divider my="sm" />
        <Group p="apart">
          <Text>
            <strong>Start Date:</strong> {formatDate(assessment?.startDate)}
          </Text>
          <Text>
            <strong>End Date:</strong> {formatDate(assessment?.endDate)}
          </Text>
        </Group>
        {!hasFacultyPermission && assessment?.isReleased && (
          <Group p="center" mt="md">
            <Button onClick={handleTakeAssessment}>Take Assessment</Button>
          </Group>
        )}
      </Card>

      {/* Submissions Section */}
      <Card withBorder shadow="sm">
        <Title order={3} mb="sm">
          Submissions
        </Title>
        {submissions.length === 0 ? (
          <Text>No submissions available.</Text>
        ) : (
          submissions.map((submission) => (
            <SubmissionCard
              key={submission._id}
              submission={submission}
              hasFacultyPermission={hasFacultyPermission}
              courseId={courseId}
              assessmentId={assessment?._id}
              questions={questions}
              userIdToNameMap={userIdToNameMap}
            />
          ))
        )}
      </Card>
    </Box>
  );
};

export default AssessmentInternalOverview;
