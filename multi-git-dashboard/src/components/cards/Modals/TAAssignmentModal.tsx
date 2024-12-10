import React from 'react';
import {
  Button,
  Card,
  Divider,
  Group,
  Modal,
  Text,
  Box,
  Checkbox,
  NumberInput,
  ScrollArea,
  MultiSelect,
  Badge,
  Alert,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { User } from '@shared/types/User';
import { AssignedTeam, AssignedUser } from '@shared/types/AssessmentAssignmentSet';

interface TAAssignmentModalProps {
  opened: boolean;
  onClose: () => void;
  teachingStaff: User[];
  assignedTeams: AssignedTeam[];
  assignedUsers: AssignedUser[];
  gradeOriginalTeams: boolean;
  teamsPerTA: number;
  excludedTeachingStaff: string[];
  selectedTeachingStaff: string[];
  onSetGradeOriginalTeams: (val: boolean) => void;
  onSetTeamsPerTA: (val: number) => void;
  onSetExcludedTeachingStaff: (val: string[]) => void;
  onSetSelectedTeachingStaff: (val: string[]) => void;
  onMassAssign: () => void;
  onRandomizeTAs: () => void;
  onSaveAssignments: () => void;
  errorMessage: string;
  warningMessage: string;
  availableTAs: User[];
  isAssignmentsValid: boolean;
  assessmentGranularity: 'team' | 'individual' | undefined;
  handleTaAssignmentChange: (id: string, selectedTAIds: string[] | null) => void;
}

const TAAssignmentModal: React.FC<TAAssignmentModalProps> = ({
  opened,
  onClose,
  teachingStaff,
  assignedTeams,
  assignedUsers,
  gradeOriginalTeams,
  teamsPerTA,
  excludedTeachingStaff,
  selectedTeachingStaff,
  onSetGradeOriginalTeams,
  onSetTeamsPerTA,
  onSetExcludedTeachingStaff,
  onSetSelectedTeachingStaff,
  onMassAssign,
  onRandomizeTAs,
  onSaveAssignments,
  errorMessage,
  warningMessage,
  availableTAs,
  isAssignmentsValid,
  assessmentGranularity,
  handleTaAssignmentChange,
}) => {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
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
          onChange={onSetSelectedTeachingStaff}
          rightSection={<IconSearch size={16} />}
        />
        <Button
          mt="sm"
          onClick={onMassAssign}
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
          {assessmentGranularity === 'team' &&
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

          {assessmentGranularity === 'individual' &&
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

      {assessmentGranularity === 'team' && (
        <Box mt="md">
          <Text>Randomization: </Text>
          <Group justify="space-between" align="flex-end" mt="md">
            <Checkbox
              label="Grade original teams"
              checked={gradeOriginalTeams}
              onChange={event =>
                onSetGradeOriginalTeams(event.currentTarget.checked)
              }
            />
            <NumberInput
              label="Teams per TA"
              value={teamsPerTA}
              onChange={value =>
                onSetTeamsPerTA(parseInt(value.toString()) || 1)
              }
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
            onChange={onSetExcludedTeachingStaff}
            mt="md"
          />

          <Button
            mt="sm"
            onClick={onRandomizeTAs}
            disabled={availableTAs.length === 0}
          >
            Randomize
          </Button>
        </Box>
      )}

      <Divider mt="xs" mb="xs" />

      {!isAssignmentsValid && (
        <Text c="red" mb="sm">
          Some teams/users have no assigned graders. Please assign at least one grader each.
        </Text>
      )}

      {/* Error or Warning Messages */}
      {errorMessage && (
        <Alert color="red" mb="sm">
          {errorMessage}
        </Alert>
      )}
      {warningMessage && (
        <Alert color="yellow" mb="sm">
          {warningMessage}
        </Alert>
      )}

      <Group justify="flex-end" mt="md">
        <Button onClick={onSaveAssignments} disabled={!isAssignmentsValid}>
          Save Assignments
        </Button>
      </Group>
    </Modal>
  );
};

export default TAAssignmentModal;
