import React, { useState } from 'react';
import {
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Modal,
  Select,
  Table,
  Text,
  Title,
  Badge,
  Box,
} from '@mantine/core';
import { InternalAssessment } from '@shared/types/InternalAssessment'; // Use InternalAssessment type
import { useRouter } from 'next/router';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import UpdateAssessmentInternalForm from '../forms/UpdateAssessmentInternalForm';

interface AssessmentInternalOverviewProps {
  courseId: string;
  assessment: InternalAssessment | null;
  hasFacultyPermission: boolean;
  onUpdateAssessment: () => void;
}

// Function to handle rendering of dates
const formatDate = (date: Date | undefined) => {
  return date ? new Date(date).toLocaleDateString() : 'N/A';
};

const AssessmentInternalOverview: React.FC<AssessmentInternalOverviewProps> = ({
  courseId,
  assessment,
  hasFacultyPermission,
  onUpdateAssessment,
}) => {
  const [teamFilter, setTeamFilter] = useState<string>('All Teams');
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const router = useRouter();
  const deleteInternalAssessmentApiRoute = `/api/internal-assessments/${assessment?._id}`; // Update API route to delete internal assessment

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

  const handleFilterChange = (value: string | null) => {
    setTeamFilter(value || 'All Teams');
  };

  const toggleEditModal = () => setIsEditModalOpen((o) => !o);
  const toggleDeleteModal = () => setIsDeleteModalOpen((o) => !o);

  const onUpdate = () => {
    onUpdateAssessment();
    toggleEditModal();
  };

  const teamOptions = [
    'All Teams',
    ...new Set(assessment?.teamSet?.teams?.map((team) => team.number.toString())),
  ]
    .sort((a, b) => {
      if (a === 'All Teams') return -1;
      if (b === 'All Teams') return 1;

      return parseInt(a, 10) - parseInt(b, 10);
    })
    .map((team) => ({ value: team, label: `${team}` }));

  return (
    <Box>
      <Modal opened={isEditModalOpen} onClose={toggleEditModal} title="Edit Assessment">
        <UpdateAssessmentInternalForm assessment={assessment} onAssessmentUpdated={onUpdate} />
      </Modal>
      <Modal opened={isDeleteModalOpen} onClose={toggleDeleteModal} title="Confirm Delete">
        <Text>Are you sure you want to delete this assessment?</Text>
        <Group mt="md" mb="md">
          <Button variant="default" onClick={toggleDeleteModal}>
            Cancel
          </Button>
          <Button color="red" onClick={deleteAssessment}>
            Delete
          </Button>
        </Group>
      </Modal>

      <Card withBorder shadow="sm" mb="lg">
        <Group justify="space-between">
          <Box>
            <Title order={2}>{assessment?.assessmentName}</Title>
            <Text color="dimmed">{assessment?.description}</Text>
          </Box>
          {hasFacultyPermission && (
            <Group>
              <Button variant="light" color="blue" onClick={toggleEditModal} leftSection={<IconEdit size={16} />}>
                Edit
              </Button>
              <Button variant="light" color="red" onClick={toggleDeleteModal} leftSection={<IconTrash size={16} />}>
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
      </Card>

      {hasFacultyPermission && (
        <Card withBorder shadow="sm" mb="lg">
          <Group justify="space-between">
            <Select
              label="Filter by Team"
              placeholder="Select a team"
              data={teamOptions}
              value={teamFilter}
              onChange={handleFilterChange}
              style={{ minWidth: '200px' }}
            />
            <Badge color="blue" variant="light">
              Showing: {teamFilter}
            </Badge>
          </Group>
        </Card>
      )}

      <Card withBorder shadow="sm">
        <Table striped highlightOnHover>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Team</th>
              <th>Submission Status</th>
            </tr>
          </thead>
          <tbody>
            {/* Placeholder for data rows */}
            <tr>
              <td colSpan={3}>
                <Text ta="center" c="dimmed">
                  No data available
                </Text>
              </td>
            </tr>
          </tbody>
        </Table>
      </Card>
    </Box>
  );
};

export default AssessmentInternalOverview;
