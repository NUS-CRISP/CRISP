// components/views/AssessmentInternalOverview.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Card,
  Divider,
  Group,
  Modal,
  Text,
  Title,
  Box,
  Checkbox,
  NumberInput,
  ScrollArea,
  MultiSelect,
  Badge,
} from '@mantine/core';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import { Submission } from '@shared/types/Submission';
import { useRouter } from 'next/router';
import { IconEdit, IconTrash, IconUsers } from '@tabler/icons-react';
import UpdateAssessmentInternalForm from '../forms/UpdateAssessmentInternalForm';
import SubmissionCard from '../cards/SubmissionCard';
import { QuestionUnion } from '@shared/types/Question';
import { Team } from '@shared/types/Team';
import { User } from '@shared/types/User';

interface AssessmentInternalOverviewProps {
  courseId: string;
  assessment: InternalAssessment | null;
  hasFacultyPermission: boolean;
  onUpdateAssessment: () => void;
  questions: QuestionUnion[];
  userIdToNameMap: { [key: string]: string };
  teams: Team[];
  teachingTeam: User[]; // Add teachingTeam prop
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
  teams,
  teachingTeam,
}) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isTeamAssignmentModalOpen, setIsTeamAssignmentModalOpen] = useState<boolean>(false); // New state for the modal
  const [gradeOriginalTeams, setGradeOriginalTeams] = useState<boolean>(false); // For "Grade original teams" checkbox
  const [teamsPerTA, setTeamsPerTA] = useState<number>(1); // For "Teams per TA" number input
  const [taAssignments, setTaAssignments] = useState<{ [teamId: string]: User[] }>({}); // TA assignments per team
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
  const toggleTeamAssignmentModal = () => setIsTeamAssignmentModalOpen((o) => !o);

  // Update handler after editing
  const onUpdate = () => {
    onUpdateAssessment();
    toggleEditModal();
    fetchSubmissions();
  };

  // Initialize TA assignments when teams data is available
  useEffect(() => {
    if (teams.length > 0) {
      const initialAssignments: { [teamId: string]: User[] } = {};
      teams.forEach((team) => {
        // Initialize with original TA(s) if available
        initialAssignments[team._id] = team.TA ? [team.TA] : [];
      });
      setTaAssignments(initialAssignments);
    }
  }, [teams]);

  // Handle TA assignment changes
  const handleTaAssignmentChange = (teamId: string, selectedTAIds: string[] | null) => {
    const selectedTAs = teachingTeam.filter((ta) => selectedTAIds?.includes(ta._id) ?? false);
    setTaAssignments((prevAssignments) => ({
      ...prevAssignments,
      [teamId]: selectedTAs,
    }));
  };

  // Randomize TA assignments
  const handleRandomizeTAs = () => {
    const numTeams = teams.length;
    const numTAsNeeded = Math.ceil(numTeams / teamsPerTA);

    const shuffledTAs = [...teachingTeam].sort(() => 0.5 - Math.random());

    // Use as many TAs as needed
    const tasToUse = shuffledTAs.slice(0, numTAsNeeded);

    const newAssignments: { [teamId: string]: User[] } = {};

    // Assign TAs to teams in a round-robin fashion
    let taIndex = 0;

    teams.forEach((team) => {
      const assignedTAs: User[] = [];

      // Include original TA if "Grade original teams" is checked
      if (gradeOriginalTeams && team.TA) {
        assignedTAs.push(team.TA);
      }

      // Assign TAs up to the specified number
      while (assignedTAs.length < teamsPerTA) {
        const ta = tasToUse[taIndex % tasToUse.length];
        if (!assignedTAs.find((existingTa) => existingTa._id === ta._id)) {
          assignedTAs.push(ta);
        }
        taIndex++;
      }

      newAssignments[team._id] = assignedTAs;
    });

    setTaAssignments(newAssignments);
  };

  // Handle "Save Assignments" button click
  const handleSaveAssignments = () => {
    // For now, simulate an API call
    console.log('Saving TA assignments:', taAssignments);

    // Close the modal
    toggleTeamAssignmentModal();

    // You can implement the actual API call here in the future
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

      {/* Team Assignment Modal */}
      {hasFacultyPermission && (
        <Modal
          opened={isTeamAssignmentModalOpen}
          onClose={toggleTeamAssignmentModal}
          size="xl"
          title="Assign TAs"
        >
          {/* Randomization options */}
          <Group mb="md" justify="center">
            <Text>
              {'Randomization Options:'}
            </Text>
            <Checkbox
              label="Grade original teams"
              checked={gradeOriginalTeams}
              onChange={(event) => setGradeOriginalTeams(event.currentTarget.checked)}
            />
            <NumberInput
              label="Teams per TA"
              value={teamsPerTA}
              onChange={(value) => setTeamsPerTA(parseInt(value.toString()) || 1)}
              min={1}
            />
          </Group>

          {/* Teams display */}
          <ScrollArea type="auto" style={{ width: '100%', height: '60vh' }}>
            <Group
              align="flex-start"
              gap="md"
              style={{ flexWrap: 'nowrap', minWidth: '100%', overflowX: 'auto' }}
            >
              {teams.map((team) => (
                <Card key={team._id} style={{ minWidth: 250 }}>
                  <Group justify="space-between" mb="xs">
                    <Text>Team {team.number}</Text>
                    {/* Display assigned TAs with badges */}
                    {taAssignments[team._id]?.map((ta) => (
                      <Badge
                        key={ta._id}
                        color={ta._id === team.TA?._id ? 'green' : 'blue'}
                        variant="light"
                      >
                        {ta.name} {ta._id === team.TA?._id ? '(Original)' : ''}
                      </Badge>
                    ))}
                  </Group>

                  {/* TA selection */}
                  <MultiSelect
                    label="Assign TAs"
                    data={teachingTeam.map((ta) => ({ value: ta._id, label: ta.name }))}
                    value={taAssignments[team._id]?.map((ta) => ta._id) || []}
                    onChange={(value) => handleTaAssignmentChange(team._id, value)}
                    clearable
                    searchable
                  />

                  <Divider my="sm" />

                  {/* Team members */}
                  <Text c="dimmed" size="sm">
                    Members:
                  </Text>
                  {team.members.map((member) => (
                    <Text key={member._id} size="sm">
                      {member.name}
                    </Text>
                  ))}
                </Card>
              ))}
            </Group>
          </ScrollArea>

          {/* Modal footer with buttons */}
          <Group justify="space-between" mt="md">
            <Button variant="default" onClick={handleRandomizeTAs}>
              Randomize
            </Button>
            <Button onClick={handleSaveAssignments}>Save Assignments</Button>
          </Group>
        </Modal>
      )}

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
              <Button
                variant="light"
                color="green"
                onClick={toggleTeamAssignmentModal}
                leftSection={<IconUsers size={16} />}
              >
                Assign TAs
              </Button>
            </Group>
          )}
        </Group>
        <Divider my="sm" />
        <Group justify="space-between">
          <Text>
            <strong>Start Date:</strong> {formatDate(assessment?.startDate)}
          </Text>
          <Text>
            <strong>End Date:</strong> {formatDate(assessment?.endDate)}
          </Text>
        </Group>
        {!hasFacultyPermission && assessment?.isReleased && (
          <Group justify="center" mt="md">
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
