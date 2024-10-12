// components/cards/TakeAssessmentCard.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Text,
  Radio,
  Checkbox,
  Slider,
  TextInput,
  Textarea,
  Group,
  NumberInput,
  Badge,
  CloseButton,
  MultiSelect,
} from '@mantine/core';
import {
  QuestionUnion,
  MultipleChoiceQuestion,
  MultipleResponseQuestion,
  ScaleQuestion,
  ShortResponseQuestion,
  LongResponseQuestion,
  DateQuestion,
  NumberQuestion,
} from '@shared/types/Question';
import { DatePicker } from '@mantine/dates';
import { AnswerInput } from '@shared/types/AnswerInput';

interface TakeAssessmentCardProps {
  question: QuestionUnion;
  answer: AnswerInput;
  onAnswerChange: (answer: AnswerInput) => void;
  index: number;
  disabled?: boolean;
  teamMembersOptions?: { value: string; label: string }[];
  assessmentGranularity?: string; // Maybe make this enum, but probably this is ok
}

const TakeAssessmentCard: React.FC<TakeAssessmentCardProps> = ({
  question,
  answer,
  onAnswerChange,
  index,
  disabled = false,
  teamMembersOptions,
  assessmentGranularity,
}) => {
  const questionType = question.type;
  const isRequired = question.isRequired || false;
  const customInstruction = question.customInstruction || '';
  const questionText = question.text || '';
  const maxSelections =
    question.type === 'Team Member Selection' && assessmentGranularity === 'individual'
      ? 1
      : undefined;

  // Selected students from the answer
  const selectedStudents = (answer as string[]) || [];

  // Available students to select (excluding already selected ones)
  const [availableStudents, setAvailableStudents] = useState<{ value: string; label: string }[]>(
    teamMembersOptions ? teamMembersOptions.filter((student) => !selectedStudents.includes(student.value)) : []
  );

  // Update availableStudents whenever selectedStudents or teamMembersOptions change
  useEffect(() => {
    if (teamMembersOptions)
      setAvailableStudents(teamMembersOptions.filter((student) => !selectedStudents.includes(student.value)));
  }, [selectedStudents, teamMembersOptions]);

  return (
    <Box
      p="md"
      mb="md"
      style={{
        border: '1px solid #ccc',
        borderRadius: '8px',
      }}
    >
      {/* Top Badges */}
      <Group justify="space-between" mb="sm">
        <Badge color={isRequired ? 'red' : 'blue'} size="sm">
          {isRequired ? 'Required' : 'Optional'}
        </Badge>
        <Badge color="blue" size="sm">
          {questionType}
        </Badge>
      </Group>

      {/* Question instruction */}
      <Text c="gray" size="sm" mb="xs">
        {customInstruction}
      </Text>

      {/* Question text with numbering */}
      <Text mb="sm">
        {index + 1}. {questionText}
      </Text>


      {/* Team Member Selection */}
      {question.type === 'Team Member Selection' && (
        <>
          {/* Render selected students as badges */}
          <Group gap="xs" mb="sm">
            {teamMembersOptions && selectedStudents.map((userId) => {
              const student = teamMembersOptions.find((option) => option.value === userId);
              return (
                <Badge
                  key={userId}
                  variant="filled"
                  color="blue"
                  rightSection={
                    !disabled && (
                      <CloseButton
                        onClick={() => {
                          const updatedSelection = selectedStudents.filter((id) => id !== userId);
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

          {/* Search and select students */}
          {(!maxSelections || selectedStudents.length < maxSelections) ? (
            <MultiSelect
              data={availableStudents}
              placeholder="Search and select students"
              searchable
              value={[]}
              onChange={(value) => {
                // value contains all selected values, but since we're managing selectedStudents separately,
                // we'll only handle the last selected value
                const newSelection = value[value.length - 1];
                if (newSelection) {
                  const updatedSelection = [...selectedStudents, newSelection];
                  onAnswerChange(updatedSelection);
                }
              }}
              disabled={disabled}
              nothingFoundMessage="No students found"
              maxValues={maxSelections}
              onSearchChange={() => {}} // To prevent clearing search on selection
              styles={{
                input: { minWidth: '200px' },
              }}
            />
          ) : (
            // Max selections reached message
            <Text size="sm" color="dimmed">
              Maximum number of selections reached.
            </Text>
          )}
        </>
      )}

      {/* Render based on question type */}
      {questionType === 'Multiple Choice' && (
        <Group align="stretch" style={{ flexGrow: 1, flexDirection: 'column' }}>
          {(question as MultipleChoiceQuestion).options.map((option, idx) => (
            <Box
              key={idx}
              p="xs"
              style={{
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: '#fff',
                width: '100%',
              }}
            >
              <Radio
                label={option}
                checked={answer === option}
                onChange={() => onAnswerChange(option)}
                style={{ width: '100%' }}
                disabled={disabled}
              />
            </Box>
          ))}
        </Group>
      )}

      {questionType === 'Multiple Response' && (
        <Group align="stretch" style={{ flexGrow: 1, flexDirection: 'column' }}>
          {(question as MultipleResponseQuestion).options.map((option, idx) => {
            const multipleResponseAnswer = answer as string[] | undefined;
            const isChecked = multipleResponseAnswer
              ? multipleResponseAnswer.includes(option)
              : false;

            return (
              <Box
                key={idx}
                p="xs"
                style={{
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                  width: '100%',
                }}
              >
                <Checkbox
                  label={option}
                  checked={isChecked}
                  onChange={() => {
                    if (multipleResponseAnswer) {
                      if (multipleResponseAnswer.includes(option)) {
                        onAnswerChange(
                          multipleResponseAnswer.filter((a) => a !== option)
                        );
                      } else {
                        onAnswerChange([...multipleResponseAnswer, option]);
                      }
                    } else {
                      onAnswerChange([option]);
                    }
                  }}
                  style={{ width: '100%' }}
                  disabled={disabled}
                />
              </Box>
            );
          })}
        </Group>
      )}

      {questionType === 'Scale' && (
        <>
          <Slider
            value={
              answer !== undefined
                ? (answer as number)
                : (question as ScaleQuestion).labels[0].value
            }
            min={(question as ScaleQuestion).labels[0].value}
            max={(question as ScaleQuestion).scaleMax}
            marks={(question as ScaleQuestion).labels.map((label) => ({
              value: label.value,
              label: label.label,
            }))}
            step={1}
            style={{ padding: '0 20px', marginBottom: '20px' }}
            onChange={(value) => onAnswerChange(value)}
            disabled={disabled}
          />
          <Box style={{ marginTop: '24px' }} />
        </>
      )}

      {(question.type === 'Short Response' ||
        question.type === 'NUSNET ID' ||
        question.type === 'NUSNET Email') && (
        <TextInput
          placeholder={
            (question as ShortResponseQuestion).shortResponsePlaceholder || 'Enter your response here...'
          }
          value={answer as string}
          onChange={(e) => onAnswerChange(e.currentTarget.value)}
          disabled={disabled}
        />
      )}

      {questionType === 'Long Response' && (
        <Textarea
          placeholder={
            (question as LongResponseQuestion).longResponsePlaceholder ||
            'Enter your response here...'
          }
          value={answer !== undefined ? (answer as string) : ''}
          onChange={(e) => onAnswerChange(e.currentTarget.value)}
          minRows={5}
          autosize
          style={{ marginBottom: '16px' }}
          disabled={disabled}
        />
      )}

      {questionType === 'Date' && (
        <Box style={{ marginBottom: '16px' }}>
          {disabled ? (
            // Display date as string if disabled
            <Text>
              {Array.isArray(answer)
                ? (answer as [Date | null, Date | null])
                    .map((date) => (date ? date.toLocaleDateString() : 'N/A'))
                    .join(' - ')
                : answer instanceof Date
                ? answer.toLocaleDateString()
                : 'No date selected'}
            </Text>
          ) : (question as DateQuestion).isRange ? (
            <Box>
              <Text>
                {(question as DateQuestion).datePickerPlaceholder ||
                  'Select a date range'}
              </Text>
              <DatePicker
                type="range"
                style={{ marginTop: '8px', width: '100%' }}
                minDate={
                  (question as DateQuestion).minDate
                    ? new Date((question as DateQuestion).minDate!)
                    : undefined
                }
                maxDate={
                  (question as DateQuestion).maxDate
                    ? new Date((question as DateQuestion).maxDate!)
                    : undefined
                }
                value={
                  answer !== undefined && Array.isArray(answer)
                    ? (answer as [Date | null, Date | null])
                    : [null, null]
                }
                onChange={(dates: [Date | null, Date | null]) =>
                  onAnswerChange(dates)
                }
              />
            </Box>
          ) : (
            <Box>
              <Text>
                {(question as DateQuestion).datePickerPlaceholder ||
                  'Select a date'}
              </Text>
              <DatePicker
                style={{ marginTop: '8px', width: '100%' }}
                minDate={
                  (question as DateQuestion).minDate
                    ? new Date((question as DateQuestion).minDate!)
                    : undefined
                }
                maxDate={
                  (question as DateQuestion).maxDate
                    ? new Date((question as DateQuestion).maxDate!)
                    : undefined
                }
                value={
                  answer !== undefined && answer instanceof Date
                    ? (answer as Date)
                    : null
                }
                onChange={(date: Date | null) => onAnswerChange(date)}
              />
            </Box>
          )}
        </Box>
      )}

      {questionType === 'Number' && (
        <NumberInput
          min={0}
          max={(question as NumberQuestion).maxNumber || 100}
          placeholder={`Enter a number (Max: ${
            (question as NumberQuestion).maxNumber || 100
          })`}
          value={answer !== undefined ? (answer as number) : undefined}
          onChange={(value) => onAnswerChange(value)}
          style={{ marginBottom: '16px' }}
          disabled={disabled}
        />
      )}
    </Box>
  );
};

export default TakeAssessmentCard;
