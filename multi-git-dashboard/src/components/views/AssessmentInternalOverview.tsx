import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Button,
  Card,
  Divider,
  Group,
  Modal,
  Text,
  Title,
  Box,
} from '@mantine/core';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import { Submission } from '@shared/types/Submission';
import { useRouter } from 'next/router';
import { IconEdit, IconTrash, IconUsers } from '@tabler/icons-react';
import UpdateAssessmentInternalForm from '../forms/UpdateAssessmentInternalForm';
import SubmissionCard from '../cards/SubmissionCard';
import { QuestionUnion } from '@shared/types/Question';
import { User } from '@shared/types/User';
import {
  AssignedTeam,
  AssignedUser,
} from '@shared/types/AssessmentAssignmentSet';
import TAAssignmentModal from '../cards/Modals/TAAssignmentModal';

interface AssessmentInternalOverviewProps {
  courseId: string;
  assessment: InternalAssessment | null;
  hasFacultyPermission: boolean;
  onUpdateAssessment: () => void;
  questions: QuestionUnion[];
  userIdToNameMap: { [key: string]: string };
  initialAssignedTeams?: AssignedTeam[];
  initialAssignedUsers?: AssignedUser[];
  teachingStaff: User[];
}

const AssessmentInternalOverview: React.FC<AssessmentInternalOverviewProps> = ({
  courseId,
  assessment,
  hasFacultyPermission,
  onUpdateAssessment,
  questions,
  userIdToNameMap,
  initialAssignedTeams = [],
  initialAssignedUsers = [],
  teachingStaff,
}) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assignedTeams, setAssignedTeams] =
    useState<AssignedTeam[]>(initialAssignedTeams);
  const [assignedUsers, setAssignedUsers] =
    useState<AssignedUser[]>(initialAssignedUsers);

  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isTeamAssignmentModalOpen, setIsTeamAssignmentModalOpen] =
    useState<boolean>(false);

  const [gradeOriginalTeams, setGradeOriginalTeams] = useState<boolean>(false);
  const [teamsPerTA, setTeamsPerTA] = useState<number>(1);
  const [selectedTeachingStaff, setSelectedTeachingStaff] = useState<string[]>(
    []
  );
  const [excludedTeachingStaff, setExcludedTeachingStaff] = useState<string[]>(
    []
  );
  const [assignedEntitiesAvailable, setAssignedEntitiesAvailable] =
    useState<boolean>(true);

  const [errorMessage, setErrorMessage] = useState<string>('');
  const [warningMessage, setWarningMessage] = useState<string>('');

  const router = useRouter();
  const deleteInternalAssessmentApiRoute = `/api/internal-assessments/${assessment?._id}`;

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString();
  };

  // Compute available TAs based on exclusions
  const availableTAs = useMemo(() => {
    return teachingStaff.filter(ta => !excludedTeachingStaff.includes(ta._id));
  }, [teachingStaff, excludedTeachingStaff]);

  // Validate assignments (every entity must have at least one TA)
  const validateAssignments = (): boolean => {
    if (!assessment) return true;
    if (assessment.granularity === 'team') {
      return assignedTeams.every(team => team.tas.length > 0);
    } else {
      return assignedUsers.every(user => user.tas.length > 0);
    }
  };

  const isAssignmentsValid = validateAssignments();

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
        data = data.filter(submission => !submission.isDraft);
      }

      setSubmissions(data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  }, [assessment, hasFacultyPermission]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Fetch assigned entities (teams or users) that need grading
  const fetchAssignedEntities = useCallback(async () => {
    if (!assessment) return;
    try {
      const response = await fetch(
        `/api/assignment-sets/${assessment._id}/assignment-sets/taunmarked`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) {
        console.error('Error fetching assigned entities:', response.statusText);
        return;
      }
      const data = await response.json();

      // If empty array, no assigned entities left to grade
      if (Array.isArray(data) && data.length === 0) {
        setAssignedEntitiesAvailable(false);
      } else {
        setAssignedEntitiesAvailable(true);
      }
    } catch (error) {
      console.error('Error fetching assigned entities:', error);
    }
  }, [assessment]);

  useEffect(() => {
    if (hasFacultyPermission && assessment && assessment.isReleased) {
      // Fetch assigned entities if faculty and assessment is released
      fetchAssignedEntities();
    }
  }, [hasFacultyPermission, assessment, fetchAssignedEntities]);

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

  const toggleEditModal = () => setIsEditModalOpen(o => !o);
  const toggleDeleteModal = () => setIsDeleteModalOpen(o => !o);
  const toggleTeamAssignmentModal = () => {
    setErrorMessage('');
    setWarningMessage('');
    setIsTeamAssignmentModalOpen(o => !o);
  };

  const handleTaAssignmentChange = (
    id: string,
    selectedTAIds: string[] | null
  ) => {
    if (assessment?.granularity === 'team') {
      const updatedTeams = assignedTeams.map(assignedTeam => {
        if (assignedTeam.team._id === id) {
          const selectedTAs = teachingStaff.filter(
            ta => selectedTAIds?.includes(ta._id) ?? false
          );
          return { ...assignedTeam, tas: selectedTAs };
        }
        return assignedTeam;
      });
      setAssignedTeams(updatedTeams);
    } else if (assessment?.granularity === 'individual') {
      const updatedUsers = assignedUsers.map(assignedUser => {
        if (assignedUser.user._id === id) {
          const selectedTAs = teachingStaff.filter(
            ta => selectedTAIds?.includes(ta._id) ?? false
          );
          return { ...assignedUser, tas: selectedTAs };
        }
        return assignedUser;
      });
      setAssignedUsers(updatedUsers);
    }
  };

  const handleMassAssign = () => {
    const selectedTAs = teachingStaff.filter(ta =>
      selectedTeachingStaff.includes(ta._id)
    );

    if (assessment?.granularity === 'team') {
      const updatedTeams = assignedTeams.map(assignedTeam => ({
        ...assignedTeam,
        tas: [
          ...assignedTeam.tas,
          ...selectedTAs.filter(
            ta => !assignedTeam.tas.some(t => t._id === ta._id)
          ),
        ],
      }));
      setAssignedTeams(updatedTeams);
    } else if (assessment?.granularity === 'individual') {
      const updatedUsers = assignedUsers.map(assignedUser => ({
        ...assignedUser,
        tas: [
          ...assignedUser.tas,
          ...selectedTAs.filter(
            ta => !assignedUser.tas.some(t => t._id === ta._id)
          ),
        ],
      }));
      setAssignedUsers(updatedUsers);
    }

    setSelectedTeachingStaff([]);
  };

  // For randomization and saving, we just call them directly. The logic is now inside the modal.
  const handleRandomizeTAs = () => {
    // We'll just trust the modal's logic is now in the modal component.
  };

  const handleSaveAssignments = () => {
    // Also trust modal's logic is now in the modal component.
  };

  return (
    <Box>
      {/* Edit Assessment Modal */}
      <Modal
        opened={isEditModalOpen}
        onClose={toggleEditModal}
        title="Edit Assessment"
      >
        <UpdateAssessmentInternalForm
          assessment={assessment}
          onAssessmentUpdated={onUpdateAssessment}
        />
      </Modal>

      {/* Delete Assessment Modal */}
      <Modal
        opened={isDeleteModalOpen}
        onClose={toggleDeleteModal}
        title="Confirm Delete"
      >
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

      {/* TA Assignment Modal */}
      {hasFacultyPermission && (
        <TAAssignmentModal
          opened={isTeamAssignmentModalOpen}
          onClose={toggleTeamAssignmentModal}
          teachingStaff={teachingStaff}
          assignedTeams={assignedTeams}
          assignedUsers={assignedUsers}
          gradeOriginalTeams={gradeOriginalTeams}
          teamsPerTA={teamsPerTA}
          excludedTeachingStaff={excludedTeachingStaff}
          selectedTeachingStaff={selectedTeachingStaff}
          onSetGradeOriginalTeams={setGradeOriginalTeams}
          onSetTeamsPerTA={setTeamsPerTA}
          onSetExcludedTeachingStaff={setExcludedTeachingStaff}
          onSetSelectedTeachingStaff={setSelectedTeachingStaff}
          onMassAssign={handleMassAssign}
          onRandomizeTAs={handleRandomizeTAs}
          onSaveAssignments={handleSaveAssignments}
          errorMessage={errorMessage}
          warningMessage={warningMessage}
          availableTAs={availableTAs}
          isAssignmentsValid={isAssignmentsValid}
          assessmentGranularity={assessment?.granularity}
          handleTaAssignmentChange={handleTaAssignmentChange}
        />
      )}

      <Card withBorder shadow="sm" mb="lg">
        <Group justify="space-between">
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
              <Button
                variant="light"
                color="green"
                onClick={toggleTeamAssignmentModal}
                leftSection={<IconUsers size={16} />}
              >
                Assign Graders
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
        {assessment?.isReleased && (
          <Group justify="center" mt="md">
            {assignedEntitiesAvailable ? (
              <Button
                onClick={() =>
                  router.push(
                    `/courses/${courseId}/internal-assessments/${assessment?._id}/take`
                  )
                }
              >
                Submit Assessment
              </Button>
            ) : (
              <Text c="dimmed">All assigned teams/users have been graded</Text>
            )}
          </Group>
        )}
      </Card>

      <Card withBorder shadow="sm">
        <Title order={3} mb="sm">
          Submissions
        </Title>
        {submissions.length === 0 ? (
          <Text>No submissions available.</Text>
        ) : (
          submissions.map(submission => (
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
