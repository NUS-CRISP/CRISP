import React, { useEffect, useState } from 'react';
import { Button, Card, Group, Modal, Select, Table, Text } from '@mantine/core';
import { Assessment } from '@shared/types/Assessment';
import { SheetData } from '@shared/types/SheetData';
import SheetDataTable from '../google/SheetDataTable ';
import { MarkItem, Result } from '@shared/types/Result';
import router from 'next/router';
import UpdateAssessmentForm from '../forms/UpdateAssessmentForm';

interface AssessmentOverviewProps {
  courseId: string;
  assessment: Assessment | null;
  sheetData: SheetData | null;
  hasFacultyPermission: boolean;
  onUpdateSheetData: () => void;
  onUpdateAssessment: () => void;
}

const AssessmentOverview: React.FC<AssessmentOverviewProps> = ({
  courseId,
  assessment,
  sheetData,
  hasFacultyPermission,
  onUpdateSheetData,
  onUpdateAssessment,
}) => {
  const [pendingSubmissions, setPendingSubmissions] = useState<string[][]>([]);
  const [teamFilter, setTeamFilter] = useState<string>('All Teams');

  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  const assessmentSheetApiRoute = `/api/assessments/${assessment?._id}/googlesheets`;
  const assessmentApiRoute = `/api/assessments/${assessment?._id}`;

  const fetchNewSheetData = async () => {
    try {
      const response = await fetch(assessmentSheetApiRoute, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isTeam: assessment?.granularity === 'team' }),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch new sheet data');
      }
      onUpdateSheetData();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const deleteAssessment = async () => {
    try {
      const response = await fetch(assessmentApiRoute, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch delete assessment');
      }
      router.push(`/courses/${courseId}/assessments`);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const calculatePendingSubmissions = async () => {
    if (!assessment || !sheetData) return;

    const results: Result[] = assessment.results;
    const pending: string[][] = [];

    if (assessment.granularity === 'individual') {
      results.forEach((result: Result) => {
        result.marks.forEach((item: MarkItem) => {
          const isSubmitted = sheetData.rows.some(row =>
            row.includes(item.user)
          );
          if (!isSubmitted) {
            const pendingRow = [
              item.user,
              item.name,
              result.team?.number?.toString() || 'EMPTY',
              result.marker?.name || 'EMPTY',
            ];
            pending.push(pendingRow);
          }
        });
      });
    } else if (assessment.granularity === 'team') {
      const teamNumbers = new Set(
        results.map(result => result.team?.number?.toString())
      );
      teamNumbers.forEach(teamNumber => {
        const isSubmitted = sheetData.rows.some(row =>
          row.includes(teamNumber)
        );
        if (!isSubmitted) {
          const markerName =
            results.find(
              result => result.team?.number?.toString() === teamNumber
            )?.marker?.name || 'EMPTY';
          const pendingRow = [teamNumber, markerName];
          pending.push(pendingRow);
        }
      });
    }
    setPendingSubmissions(pending);
  };

  const handleFilterChange = (value: string | null) => {
    setTeamFilter(value || 'All Teams');
  };

  const toggleEditModal = () => setIsEditModalOpen(o => !o);
  const toggleDeleteModal = () => setIsDeleteModalOpen(o => !o);

  const onUpdate = () => {
    onUpdateAssessment();
    toggleEditModal();
  };

  useEffect(() => {
    calculatePendingSubmissions();
  }, [assessment, sheetData]);

  const teamOptions = [
    'All Teams',
    ...new Set(assessment?.teamSet?.teams?.map(team => team.number.toString())),
  ]
    .sort((a, b) => {
      if (a === 'All Teams') return -1;
      if (b === 'All Teams') return 1;

      return parseInt(a, 10) - parseInt(b, 10);
    })
    .map(team => ({ value: team, label: `${team}` }));

  const filteredSheetData: SheetData = sheetData
    ? {
        ...sheetData,
        rows: sheetData.rows.filter(row =>
          teamFilter === 'All Teams'
            ? true
            : assessment?.granularity === 'individual'
              ? row[2] === teamFilter
              : row[0] === teamFilter
        ),
      }
    : {
        _id: '',
        fetchedAt: new Date(),
        headers: [],
        rows: [[]],
      };

  return (
    <div>
      {hasFacultyPermission && (
        <Group style={{ marginBottom: '16px', marginTop: '16px' }}>
          <Button variant="outline" onClick={toggleEditModal}>
            Edit Assessment
          </Button>
          <Button color="red" onClick={toggleDeleteModal}>
            Delete Assessment
          </Button>
        </Group>
      )}
      <Modal
        opened={isEditModalOpen}
        onClose={toggleEditModal}
        title="Edit Assessment"
      >
        <UpdateAssessmentForm
          assessment={assessment}
          onAssessmentUpdated={onUpdate}
        />
      </Modal>
      <Modal
        opened={isDeleteModalOpen}
        onClose={toggleDeleteModal}
        title="Confirm Delete"
      >
        <Text>Are you sure you want to delete this assessment?</Text>
        <Group style={{ marginBottom: '16px', marginTop: '16px' }}>
          <Button variant="outline" onClick={toggleDeleteModal}>
            Cancel
          </Button>
          <Button color="red" onClick={deleteAssessment}>
            Delete
          </Button>
        </Group>
      </Modal>
      <Card style={{ marginBottom: '16px', marginTop: '16px' }}>
        <Text size="lg" style={{ marginBottom: '10px' }}>
          {assessment?.assessmentType}
        </Text>
        <Text>Mark Type: {assessment?.markType}</Text>
        <Text>Frequency: {assessment?.frequency}</Text>
        <Text>Granularity: {assessment?.granularity}</Text>
      </Card>
      {hasFacultyPermission && (
        <Group style={{ marginBottom: '16px', marginTop: '16px' }}>
          <Button onClick={fetchNewSheetData}>Update Sheets Data</Button>
          <Select
            label="Filter by Team"
            placeholder="Select a team"
            data={teamOptions}
            value={teamFilter}
            onChange={handleFilterChange}
            style={{ marginBottom: '20px' }}
          />
        </Group>
      )}
      {sheetData ? (
        <SheetDataTable
          data={filteredSheetData}
          pendingSubmissions={pendingSubmissions}
          isTeam={assessment?.granularity === 'team'}
        />
      ) : (
        <Table striped highlightOnHover>
          <tbody>
            <tr>
              <td>
                <Text>No data available</Text>
              </td>
            </tr>
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default AssessmentOverview;
