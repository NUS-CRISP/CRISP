// components/views/AssessmentInternalOverview.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Modal,
  Text,
  Title,
  Box,
  Table,
  Badge,
} from '@mantine/core';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import { Submission } from '@shared/types/Submission';
import { useRouter } from 'next/router';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import UpdateAssessmentInternalForm from '../forms/UpdateAssessmentInternalForm';

interface AssessmentInternalOverviewProps {
  courseId: string;
  assessment: InternalAssessment | null;
  hasFacultyPermission: boolean;
  onUpdateAssessment: () => void;
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

      const data: Submission[] = await response.json();
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
        <Group mt="md" mb="md" justify="flex-end">
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
        <Group justify="space-between">
          <Box>
            <Title order={2}>{assessment?.assessmentName}</Title>
            <Text color="dimmed">{assessment?.description}</Text>
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
        <Grid>
          <Grid.Col span={6}>
            <Text>
              <strong>Start Date:</strong> {formatDate(assessment?.startDate)}
            </Text>
          </Grid.Col>
          <Grid.Col span={6}>
            <Text>
              <strong>End Date:</strong> {formatDate(assessment?.endDate)}
            </Text>
          </Grid.Col>
        </Grid>
        {!hasFacultyPermission && assessment?.isReleased && (
          <Group justify="center" mt="md">
            <Button onClick={handleTakeAssessment}>Take Assessment</Button>
          </Group>
        )}
      </Card>

      {/* Submissions Table */}
    <Card withBorder shadow="sm">
      <Title order={3} mb="sm">
        Submissions
      </Title>
      {submissions.length === 0 ? (
        <Text>No submissions available.</Text>
      ) : (
        <Table striped highlightOnHover>
          <thead>
            <tr>
              {hasFacultyPermission && <th>Student Name</th>}
              {hasFacultyPermission && <th>Team Number</th>}
              <th>Submission Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((submission) => {
              const user = submission.user;
              const userName = user ? user.name : 'Unknown User';
              // Assuming teamNumber is part of submission or user object

              return (
                <tr
                  key={submission._id}
                  style={{ cursor: 'pointer' }}
                  onClick={() =>
                    router.push(
                      `/courses/${courseId}/internal-assessments/${assessment?._id}/submission/${submission._id}`
                    )
                  }
                >
                  {hasFacultyPermission && <td>{userName}</td>}
                  <td>{formatDate(submission.submittedAt)}</td>
                  <td>
                    {submission.isDraft ? (
                      <Badge color="yellow">Draft</Badge>
                    ) : (
                      <Badge color="green">Submitted</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Card>
    </Box>
  );
};

export default AssessmentInternalOverview;
