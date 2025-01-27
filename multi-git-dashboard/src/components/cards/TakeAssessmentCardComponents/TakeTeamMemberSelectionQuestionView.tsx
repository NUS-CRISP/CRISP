import React, { useEffect, useState } from 'react';
import { Badge, CloseButton, MultiSelect, Group } from '@mantine/core';
import { AnswerInput } from '@shared/types/AnswerInput';

interface TakeTeamMemberSelectionQuestionViewProps {
  answer: AnswerInput;
  onAnswerChange: (answer: AnswerInput) => void;
  disabled?: boolean;
  teamMembersOptions?: { value: string; label: string }[];
  teamOptions?: {
    value: string;
    label: string;
    members: { value: string; label: string }[];
  }[];
  assessmentGranularity?: string; // 'team' or 'individual'
}

const TakeTeamMemberSelectionQuestionView: React.FC<
  TakeTeamMemberSelectionQuestionViewProps
> = ({
  answer,
  onAnswerChange,
  disabled = false,
  teamMembersOptions,
  teamOptions,
  assessmentGranularity,
}) => {
  const maxSelections = assessmentGranularity === 'individual' ? 1 : undefined;

  // Selected IDs (either student IDs or team IDs)
  const selectedIds = Array.isArray(answer) ? (answer as string[]) : [];

  // Available options to select (excluding already selected ones)
  const [availableOptions, setAvailableOptions] = useState<
    { value: string; label: string }[]
  >([]);

  // Update availableOptions whenever selectedIds or teamMembersOptions/teamOptions change
  useEffect(() => {
    if (assessmentGranularity === 'team' && teamOptions) {
      // For team granularity, use teamOptions
      setAvailableOptions(
        teamOptions
          .filter(team => !selectedIds.includes(team.value))
          .map(team => ({
            value: team.value,
            label: team.label,
          }))
      );
    } else if (assessmentGranularity === 'individual' && teamMembersOptions) {
      // For individual granularity, use teamMembersOptions
      setAvailableOptions(
        teamMembersOptions.filter(
          student => !selectedIds.includes(student.value)
        )
      );
    }
  }, [selectedIds, teamMembersOptions, teamOptions, assessmentGranularity]);

  return (
    <>
      <Group gap="xs" mb="sm">
        {assessmentGranularity === 'team' &&
          teamOptions &&
          selectedIds.map(teamId => {
            const team = teamOptions.find(option => option.value === teamId);
            return (
              <Badge
                key={teamId}
                variant="filled"
                color="blue"
                rightSection={
                  !disabled && (
                    <CloseButton
                      onClick={() => {
                        const updatedSelection = selectedIds.filter(
                          id => id !== teamId
                        );
                        onAnswerChange(updatedSelection);
                      }}
                      size="xs"
                      style={{ marginLeft: 4 }}
                    />
                  )
                }
              >
                {team ? team.label : teamId}
              </Badge>
            );
          })}

        {assessmentGranularity === 'individual' &&
          teamMembersOptions &&
          selectedIds.map(userId => {
            const student = teamMembersOptions.find(
              option => option.value === userId
            );
            return (
              <Badge
                key={userId}
                variant="filled"
                color="blue"
                rightSection={
                  !disabled && (
                    <CloseButton
                      onClick={() => {
                        const updatedSelection = selectedIds.filter(
                          id => id !== userId
                        );
                        onAnswerChange(updatedSelection);
                      }}
                      size="xs"
                      style={{ marginLeft: 4 }}
                    />
                  )
                }
              >
                {student ? student.label : userId}
              </Badge>
            );
          })}
      </Group>
      <MultiSelect
        data={availableOptions}
        placeholder={
          assessmentGranularity === 'team'
            ? 'Search and select teams'
            : 'Search and select students'
        }
        searchable
        value={[]}
        onChange={value => {
          // Handle only the last selected value
          const newSelection = value[value.length - 1];
          if (newSelection) {
            const updatedSelection = [...selectedIds, newSelection];
            onAnswerChange(updatedSelection);
          }
        }}
        disabled={disabled}
        maxValues={maxSelections}
        onSearchChange={() => {}} // Prevent clearing search on selection
        styles={{
          input: { minWidth: '200px' },
        }}
      />
    </>
  );
};

export default TakeTeamMemberSelectionQuestionView;
