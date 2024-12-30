/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
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
  MultiSelect,
  Badge,
  Alert,
} from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import Papa from 'papaparse';
import { IconSearch, IconUpload, IconX, IconPhoto } from '@tabler/icons-react';
import { Virtuoso } from 'react-virtuoso';

import { User } from '@shared/types/User';
import {
  AssignedTeam,
  AssignedUser,
} from '@shared/types/AssessmentAssignmentSet';

interface TAAssignmentModalProps {
  opened: boolean;
  onClose: () => void;
  teachingStaff: User[]; // Each User has ._id plus .identifier
  assignedTeams: AssignedTeam[]; // .team.number, .tas is array of TAs
  assignedUsers: AssignedUser[]; // .user.identifier, .tas is array of TAs
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
  /**
   * handleTaAssignmentChange: call with the actual team/user _id, plus an array of TA _ids.
   */
  handleTaAssignmentChange: (
    entityMongoId: string,
    selectedTAIds: string[] | null
  ) => void;
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
  // ---------------------------------------
  // 1. STATE FOR CSV MODAL & PARSING
  // ---------------------------------------
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvErrorMessage, setCsvErrorMessage] = useState<string | null>(null);

  // Track the CSV file name for preview
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Temporarily store parsed rows here until user clicks "Upload Assignments"
  const [parsedRows, setParsedRows] = useState<any[] | null>(null);

  /** Called when the user selects or drops a CSV file */
  const handleFileSelected = (file: File) => {
    setUploadedFileName(file.name);
    parseCsvFile(file);
  };

  /** Parse the CSV with Papa Parse, store result in `parsedRows` */
  const parseCsvFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: results => {
        try {
          const data = results.data as any[];
          data.forEach((row, idx) => {
            const rowIndex = idx + 1;
            if (!row.entityId) {
              throw new Error(`Row ${rowIndex} is missing "entityId"`);
            }
            if (row.taIds === undefined) {
              throw new Error(`Row ${rowIndex} is missing "taIds"`);
            }
          });
          setParsedRows(data);
          setCsvErrorMessage(null);
        } catch (err: any) {
          console.error('Error validating CSV data:', err?.message);
          setCsvErrorMessage(`Error validating CSV: ${err?.message}`);
          setParsedRows(null);
        }
      },
      error: err => {
        console.error('Error parsing CSV:', err.message);
        setCsvErrorMessage(`Error parsing CSV: ${err.message}`);
        setParsedRows(null);
      },
    });
  };

  /** When user clicks "Upload Assignments", apply them in memory */
  const handleApplyAssignments = () => {
    if (!parsedRows) {
      setCsvErrorMessage(
        'No parsed rows found. Please select a valid CSV file first.'
      );
      return;
    }

    try {
      applyAssignmentsFromCsv(parsedRows);
      setIsCsvModalOpen(false);
      setCsvErrorMessage(null);
      setParsedRows(null);
      setUploadedFileName(null);
    } catch (err: any) {
      setCsvErrorMessage(`Error applying assignments: ${err?.message}`);
    }
  };

  /**
   * 2. For each row => find the matching team or user by "entityId"
   *    Then find the TAs by their "identifier"
   *    Finally call handleTaAssignmentChange with the actual _ids
   */
  const applyAssignmentsFromCsv = (rows: any[]) => {
    rows.forEach((row, idx) => {
      const rowIndex = idx + 1;
      const entityIdString = String(row.entityId).trim(); // e.g. "3" or "E1234567"
      if (!entityIdString) {
        throw new Error(`Row ${rowIndex} has empty entityId`);
      }

      // 1) Find the team's or user's _id
      let entityMongoId: string | null = null;

      if (assessmentGranularity === 'team') {
        // e.g. entityIdString = "3", match .team.number
        const match = assignedTeams.find(
          t => String(t.team.number) === entityIdString
        );
        if (!match) {
          throw new Error(
            `Row ${rowIndex}: No team with number "${entityIdString}" found.`
          );
        }
        entityMongoId = match.team._id;
      } else if (assessmentGranularity === 'individual') {
        // e.g. "E1234567", match .user.identifier
        const match = assignedUsers.find(
          u => u.user.identifier === entityIdString
        );
        if (!match) {
          throw new Error(
            `Row ${rowIndex}: No user with identifier "${entityIdString}" found.`
          );
        }
        entityMongoId = match.user._id;
      } else {
        throw new Error('Assessment granularity is undefined.');
      }

      // 2) Convert TA "identifiers" => TA Mongo _ids
      const taIdsField = row.taIds || '';
      const taIdentifiers = taIdsField
        .split(';')
        .map((id: string) => id.trim())
        .filter(Boolean);

      const mappedTaMongoIds: string[] = [];
      taIdentifiers.forEach((taIdStr: string) => {
        const staff = teachingStaff.find(s => s.identifier === taIdStr);
        if (!staff) {
          throw new Error(
            `Row ${rowIndex}: No TA found with identifier "${taIdStr}".`
          );
        }
        mappedTaMongoIds.push(staff._id);
      });

      // Finally call handleTaAssignmentChange with the actual team/user _id
      handleTaAssignmentChange(entityMongoId, mappedTaMongoIds);
    });
  };

  /** 3. Download CSV Template with instructions. */
  const handleDownloadTemplate = () => {
    const headers = ['entityId', 'taIds'];
    const instructions = [
      '# CSV Template for TA Assignments',
      '# entityId => if "team", use team.number (e.g. "3")',
      '#             if "individual", use user.identifier (e.g. "E1234567")',
      '# taIds => semicolon-separated TA identifiers',
      '# Example row: entityId,taIds',
      '# 3,"A11111;A22222"',
      '',
    ].join('\n');

    const content = instructions + headers.join(',') + '\n';
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const filename = 'ta_assignment_template.csv';

    const navObj: any = window.navigator;
    if (navObj.msSaveOrOpenBlob) {
      navObj.msSaveOrOpenBlob(blob, filename);
    } else {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  /**
   * 4. Download CURRENT ASSIGNMENTS:
   *    Convert what's in assignedTeams or assignedUsers => CSV.
   */
  const handleDownloadCurrentAssignments = () => {
    const rows: string[] = [];
    // CSV Header
    rows.push('entityId,taIds');

    // Helper to map TA _id => TA identifier
    const findTaIdentifier = (taId: string) => {
      const staff = teachingStaff.find(s => s._id === taId);
      return staff?.identifier || 'UNKNOWN';
    };

    if (assessmentGranularity === 'team') {
      // For each assignedTeam => entityId = team.number, taIds = semicolon separated
      assignedTeams.forEach(assignedTeam => {
        const entityId = String(assignedTeam.team.number);
        const taIdentifiers = assignedTeam.tas
          .map(ta => findTaIdentifier(ta._id))
          .join(';');
        rows.push(`${entityId},"${taIdentifiers}"`);
      });
    } else if (assessmentGranularity === 'individual') {
      // For each assignedUser => entityId = user.identifier, taIds = semicolon separated
      assignedUsers.forEach(assignedUser => {
        const entityId = assignedUser.user.identifier;
        const taIdentifiers = assignedUser.tas
          .map(ta => findTaIdentifier(ta._id))
          .join(';');
        rows.push(`${entityId},"${taIdentifiers}"`);
      });
    } else {
      // No granularity => skip
    }

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const filename = 'current_ta_assignments.csv';

    const navObj: any = window.navigator;
    if (navObj.msSaveOrOpenBlob) {
      navObj.msSaveOrOpenBlob(blob, filename);
    } else {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // ---------------------------------------
  // MAIN COMPONENT RENDER
  // ---------------------------------------
  return (
    <Modal opened={opened} onClose={onClose} size="xl" title="Assign Graders">
      <Box mb="md">
        <Group>
          <Button variant="outline" onClick={() => setIsCsvModalOpen(true)}>
            Upload CSV
          </Button>

          <Button variant="outline" onClick={handleDownloadCurrentAssignments}>
            Download Current Assignments
          </Button>
        </Group>
      </Box>

      {/* --- Top Section: Mass Assign --- */}
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

      {/* --- Middle Section: Teams or Users Display with Virtuoso --- */}
      <Box style={{ display: 'flex', flexDirection: 'column', height: '40vh' }}>
        <Virtuoso
          style={{ flex: 0.95, overscrollBehavior: 'none' }}
          totalCount={
            assessmentGranularity === 'team'
              ? assignedTeams.length
              : assessmentGranularity === 'individual'
              ? assignedUsers.length
              : 0
          }
          itemContent={(index) => {
            if (assessmentGranularity === 'team') {
              const assignedTeam = assignedTeams[index];
              return (
                <Card key={assignedTeam.team._id} style={{ marginBottom: '16px' }}>
                  <Group justify="space-between" mb="xs">
                    <Text>Team {assignedTeam.team.number}</Text>
                    {assignedTeam.tas.map(ta => (
                      <Badge
                        key={ta._id}
                        color={
                          ta._id === assignedTeam.team.TA?._id ? 'green' : 'blue'
                        }
                        variant="light"
                      >
                        {ta.name}
                        {ta._id === assignedTeam.team.TA?._id
                          ? ' (Original)'
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
                    onChange={(value) =>
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
              );
            } else if (assessmentGranularity === 'individual') {
              const assignedUser = assignedUsers[index];
              return (
                <Card key={assignedUser.user._id} style={{ marginBottom: '16px' }}>
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
                    onChange={(value) =>
                      handleTaAssignmentChange(assignedUser.user._id, value)
                    }
                    clearable
                    searchable
                  />
                </Card>
              );
            } else {
              return null;
            }
          }}
        />
      </Box>

      <Divider mt="xs" mb="xs" />

      {assessmentGranularity === 'team' && (
        <Box mt="md">
          <Text>Randomization:</Text>
          <Group justify="space-between" align="flex-end" mt="md">
            <Checkbox
              label="Grade original teams"
              checked={gradeOriginalTeams}
              onChange={(event) =>
                onSetGradeOriginalTeams(event.currentTarget.checked)
              }
            />
            <NumberInput
              label="Teams per TA"
              value={teamsPerTA}
              onChange={(value) =>
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
        <Text color="red" mb="sm">
          Some teams/users have no assigned graders. Please assign at least one
          grader each.
        </Text>
      )}

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

      {/* ------------------------------------ */}
      {/* CSV UPLOAD MODAL: parse & apply CSV  */}
      {/* ------------------------------------ */}
      <Modal
        opened={isCsvModalOpen}
        onClose={() => {
          setIsCsvModalOpen(false);
          setUploadedFileName(null);
          setParsedRows(null);
          setCsvErrorMessage(null);
        }}
        title="Upload TA Assignments via CSV"
      >
        {csvErrorMessage && (
          <Alert color="red" mb="md">
            {csvErrorMessage}
          </Alert>
        )}

        <Text size="sm" mb="xs">
          The CSV should have 2 columns:
          <br />
          <strong>entityId</strong> - If "team," the team.number (e.g. "3"). If
          "individual," the user.identifier (e.g. "E1234567").
          <br />
          <strong>taIds</strong> - Semicolon-separated TA identifiers (not Mongo
          _ids).
        </Text>

        {/* Dropzone for CSV with Accept/Reject/Idle */}
        <Dropzone
          onDrop={(files) => {
            if (files.length > 0) {
              handleFileSelected(files[0]);
            }
          }}
          accept={[MIME_TYPES.csv]}
          multiple={false}
          maxSize={5 * 1024 * 1024}
          style={{ marginTop: '16px' }}
        >
          <Group mih={220} style={{ pointerEvents: 'none' }} justify="center">
            <Dropzone.Accept>
              <IconUpload
                style={{ color: 'var(--mantine-color-blue-6)' }}
                size={48}
                stroke={1.5}
              />
            </Dropzone.Accept>

            <Dropzone.Reject>
              <IconX
                style={{ color: 'var(--mantine-color-red-6)' }}
                size={48}
                stroke={1.5}
              />
            </Dropzone.Reject>

            <Dropzone.Idle>
              <IconPhoto
                style={{ color: 'var(--mantine-color-dimmed)' }}
                size={48}
                stroke={1.5}
              />
            </Dropzone.Idle>

            <Text size="xl" inline>
              Drag CSV here or click to select a file
            </Text>
            <Text size="sm" color="dimmed" inline mt={7}>
              Only .csv files are accepted • Max size 5MB
            </Text>
          </Group>
        </Dropzone>

        {uploadedFileName && (
          <Text size="sm" color="dimmed" mt="md">
            Selected file: <strong>{uploadedFileName}</strong>
          </Text>
        )}

        <Group justify="space-between" mt="md">
          <Button variant="outline" onClick={handleDownloadTemplate}>
            Download CSV Template
          </Button>

          {/* "Upload" button that finalizes the assignment */}
          <Button onClick={handleApplyAssignments} disabled={!parsedRows}>
            Upload Assignments
          </Button>
        </Group>
      </Modal>
    </Modal>
  );
};

export default TAAssignmentModal;
