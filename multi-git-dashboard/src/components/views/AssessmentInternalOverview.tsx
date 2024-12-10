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
  Checkbox,
  NumberInput,
  ScrollArea,
  MultiSelect,
  Badge,
} from '@mantine/core';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import { Submission } from '@shared/types/Submission';
import { useRouter } from 'next/router';
import {
  IconEdit,
  IconTrash,
  IconUsers,
  IconSearch,
} from '@tabler/icons-react';
import UpdateAssessmentInternalForm from '../forms/UpdateAssessmentInternalForm';
import SubmissionCard from '../cards/SubmissionCard';
import { QuestionUnion } from '@shared/types/Question';
import { User } from '@shared/types/User';
import {
  AssignedTeam,
  AssignedUser,
} from '@shared/types/AssessmentAssignmentSet';

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
  const [assignedTeams, setAssignedTeams] = useState<AssignedTeam[]>(initialAssignedTeams);
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>(initialAssignedUsers);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isTeamAssignmentModalOpen, setIsTeamAssignmentModalOpen] = useState<boolean>(false);
  const [gradeOriginalTeams, setGradeOriginalTeams] = useState<boolean>(false);
  const [teamsPerTA, setTeamsPerTA] = useState<number>(1);
  const [selectedTeachingStaff, setSelectedTeachingStaff] = useState<string[]>([]);
  const [excludedTeachingStaff, setExcludedTeachingStaff] = useState<string[]>([]);
  const [assignedEntitiesAvailable, setAssignedEntitiesAvailable] = useState<boolean>(true); // New state

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
        data = data.filter(submission => !submission.isDraft);
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
  const toggleEditModal = () => setIsEditModalOpen(o => !o);
  const toggleDeleteModal = () => setIsDeleteModalOpen(o => !o);
  const toggleTeamAssignmentModal = () => setIsTeamAssignmentModalOpen(o => !o);

  // Handle TA assignment changes
  const handleTaAssignmentChange = (id: string, selectedTAIds: string[] | null) => {
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

  const mergeUniqueUsers = (existingTas: User[], newTas: User[]): User[] => {
    const combinedTas = [...existingTas];
    newTas.forEach(newTa => {
      if (!combinedTas.some(existingTa => existingTa._id === newTa._id)) {
        combinedTas.push(newTa);
      }
    });
    return combinedTas;
  };

  // Handle Mass Assign Teaching Staff
  const handleMassAssign = () => {
    const selectedTAs = teachingStaff.filter(ta =>
      selectedTeachingStaff.includes(ta._id)
    );

    if (assessment?.granularity === 'team') {
      const updatedTeams = assignedTeams.map(assignedTeam => ({
        ...assignedTeam,
        tas: mergeUniqueUsers(assignedTeam.tas, selectedTAs),
      }));
      setAssignedTeams(updatedTeams);
    } else if (assessment?.granularity === 'individual') {
      const updatedUsers = assignedUsers.map(assignedUser => ({
        ...assignedUser,
        tas: mergeUniqueUsers(assignedUser.tas, selectedTAs),
      }));
      setAssignedUsers(updatedUsers);
    }

    setSelectedTeachingStaff([]);
  };

  // Randomize TA assignments
  const handleRandomizeTAs = () => {
    const numTeams = assignedTeams.length;
    const numTAsNeeded = Math.ceil(numTeams / teamsPerTA);
    const shuffledTAs = [...availableTAs].sort(() => 0.5 - Math.random());
    const tasToUse = shuffledTAs.slice(0, numTAsNeeded);
    let taIndex = 0;

    const updatedTeams = assignedTeams.map(assignedTeam => {
      const assignedTAs: User[] = [];

      // Include original TA if "Grade original teams" is checked and not excluded
      if (
        gradeOriginalTeams &&
        assignedTeam.team.TA &&
        !excludedTeachingStaff.includes(assignedTeam.team.TA._id)
      ) {
        assignedTAs.push(assignedTeam.team.TA);
      }

      while (assignedTAs.length < teamsPerTA && tasToUse.length > 0) {
        const ta = tasToUse[taIndex % tasToUse.length];
        if (!assignedTAs.find(existingTa => existingTa._id === ta._id)) {
          assignedTAs.push(ta);
        }
        taIndex++;
      }

      return { ...assignedTeam, tas: assignedTAs };
    });

    setAssignedTeams(updatedTeams);
  };

  // Save TA assignments
  const handleSaveAssignments = async () => {
    try {
      const response = await fetch(
        `/api/internal-assessments/${assessment!._id}/assignment-sets`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assignedTeams:
              assessment?.granularity === 'team'
                ? assignedTeams.map(team => ({
                    team: team.team._id,
                    tas: team.tas.map(ta => ta._id),
                  }))
                : undefined,
            assignedUsers:
              assessment?.granularity === 'individual'
                ? assignedUsers.map(user => ({
                    user: user.user._id,
                    tas: user.tas.map(ta => ta._id),
                  }))
                : undefined,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save TA assignments');
      }

      const data = await response.json();
      console.log('TA assignments saved successfully:', data);
      toggleTeamAssignmentModal();
    } catch (error) {
      console.error('Error saving TA assignments:', error);
    }
  };

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
    fetchSubmissions();
  }, [fetchSubmissions]);

  useEffect(() => {
    if (hasFacultyPermission && assessment && assessment.isReleased) {
      // Fetch assigned entities if faculty and assessment is released
      fetchAssignedEntities();
    }
  }, [hasFacultyPermission, assessment, fetchAssignedEntities]);

  // Handle "Take Assessment" button click
  const handleTakeAssessment = () => {
    router.push(
      `/courses/${courseId}/internal-assessments/${assessment?._id}/take`
    );
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

      {/* Team Assignment Modal */}
      {hasFacultyPermission && (
        <Modal
          opened={isTeamAssignmentModalOpen}
          onClose={toggleTeamAssignmentModal}
          size="xl"
          title="Assign Graders"
        >
          {/* Top Section: Search and Mass Assign Teaching Staff */}
          <Box mb="md">
            <MultiSelect
              data={teachingStaff.map(staff => ({
                value: staff._id,
                label: staff.name,
              }))}
              label="Search Teaching Staff"
              placeholder="Select teaching staff to mass assign to all teams"
              searchable
              value={selectedTeachingStaff}
              onChange={setSelectedTeachingStaff}
              rightSection={<IconSearch size={16} />}
            />
            <Button
              mt="sm"
              onClick={handleMassAssign}
              disabled={selectedTeachingStaff.length === 0}
            >
              Mass Assign Selected TAs to All Teams
            </Button>
          </Box>

          <Divider mt="xs" mb="xs" />

          {/* Middle Section: Teams or Users Display */}
          <ScrollArea type="auto" style={{ width: '100%', height: '40vh' }}>
            <Group
              align="flex-start"
              gap="md"
              style={{
                flexWrap: 'nowrap',
                minWidth: '100%',
                overflowX: 'auto',
              }}
            >
              {assessment?.granularity === 'team' &&
                assignedTeams.map(assignedTeam => (
                  <Card key={assignedTeam.team._id} style={{ minWidth: 250 }}>
                    <Group justify="space-between" mb="xs">
                      <Text>Team {assignedTeam.team.number}</Text>
                      {assignedTeam.tas.map(ta => (
                        <Badge
                          key={ta._id}
                          color={
                            ta._id === assignedTeam.team.TA?._id
                              ? 'green'
                              : 'blue'
                          }
                          variant="light"
                        >
                          {ta.name}{' '}
                          {ta._id === assignedTeam.team.TA?._id
                            ? '(Original)'
                            : ''}
                        </Badge>
                      ))}
                    </Group>

                    <MultiSelect
                      label="Assign Graders"
                      data={teachingStaff.map(ta => ({
                        value: ta._id,
                        label: ta.name,
                      }))}
                      value={assignedTeam.tas.map(ta => ta._id) || []}
                      onChange={value =>
                        handleTaAssignmentChange(assignedTeam.team._id, value)
                      }
                      clearable
                      searchable
                    />

                    <Divider my="sm" />

                    <Text color="dimmed" size="sm">
                      Members:
                    </Text>
                    {assignedTeam.team.members.map(member => (
                      <Text key={member._id} size="sm">
                        {member.name}
                      </Text>
                    ))}
                  </Card>
                ))}

              {assessment?.granularity === 'individual' &&
                assignedUsers.map(assignedUser => (
                  <Card key={assignedUser.user._id} style={{ minWidth: 250 }}>
                    <Group justify="space-between" mb="xs">
                      <Text>{assignedUser.user.name}</Text>
                      {assignedUser.tas.map(ta => (
                        <Badge key={ta._id} color="blue" variant="light">
                          {ta.name}
                        </Badge>
                      ))}
                    </Group>

                    <MultiSelect
                      label="Assign Graders"
                      data={teachingStaff.map(ta => ({
                        value: ta._id,
                        label: ta.name,
                      }))}
                      value={assignedUser.tas.map(ta => ta._id) || []}
                      onChange={value =>
                        handleTaAssignmentChange(assignedUser.user._id, value)
                      }
                      clearable
                      searchable
                    />
                  </Card>
                ))}
            </Group>
          </ScrollArea>

          <Divider mt="xs" mb="xs" />

          {assessment?.granularity === 'team' && (
            <Box mt="md">
              <Text>Randomization: </Text>
              <Group justify="space-between" align="flex-end" mt="md">
                <Checkbox
                  label="Grade original teams"
                  checked={gradeOriginalTeams}
                  onChange={event =>
                    setGradeOriginalTeams(event.currentTarget.checked)
                  }
                />
                <NumberInput
                  label="Teams per TA"
                  value={teamsPerTA}
                  onChange={value => setTeamsPerTA(parseInt(value.toString()) || 1)}
                  min={1}
                />
              </Group>

              <MultiSelect
                data={teachingStaff.map(ta => ({
                  value: ta._id,
                  label: ta.name,
                }))}
                label="Exclude Graders"
                placeholder="Select teaching staff to exclude from randomization"
                searchable
                value={excludedTeachingStaff}
                onChange={setExcludedTeachingStaff}
                mt="md"
              />

              <Button
                mt="sm"
                onClick={handleRandomizeTAs}
                disabled={availableTAs.length === 0}
              >
                Randomize
              </Button>
            </Box>
          )}

          <Divider mt="xs" mb="xs" />

          <Group justify="flex-end" mt="md">
            <Button onClick={handleSaveAssignments}>Save Assignments</Button>
          </Group>
        </Modal>
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
              <Button onClick={handleTakeAssessment}>Submit Assessment</Button>
            ) : (
              <Text c="dimmed">
                All assigned teams/users have been graded
              </Text>
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
