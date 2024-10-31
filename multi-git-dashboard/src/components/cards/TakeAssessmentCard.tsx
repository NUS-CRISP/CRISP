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
  MultiSelect,
  CloseButton,
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
import { Submission } from '@shared/types/Submission';

interface TakeAssessmentCardProps {
  question: QuestionUnion;
  answer: AnswerInput;
  onAnswerChange: (answer: AnswerInput) => void;
  index: number;
  disabled?: boolean;
  teamMembersOptions?: { value: string; label: string }[]; // For individual granularity
  teamOptions?: {
    value: string;
    label: string;
    members: { value: string; label: string }[];
  }[]; // For team granularity
  assessmentGranularity?: string; // 'team' or 'individual'
  isFaculty?: boolean; // Indicates if the user has faculty permissions
  submission?: Submission; // Contains per-answer scores
}

const TakeAssessmentCard: React.FC<TakeAssessmentCardProps> = ({
  question,
  answer,
  onAnswerChange,
  index,
  disabled = false,
  teamMembersOptions,
  teamOptions,
  assessmentGranularity,
  isFaculty = false, // Default to false
  submission,
}) => {
  const questionType = question.type;
  const isRequired = question.isRequired || false;
  const customInstruction = question.customInstruction || '';
  const questionText = question.text || '';
  const maxSelections =
    question.type === 'Team Member Selection' &&
    assessmentGranularity === 'individual'
      ? 1
      : undefined;

  // Selected IDs (either student IDs or team IDs)
  const selectedIds = Array.isArray(answer) ? (answer as string[]) : [];

  // Available options to select (excluding already selected ones)
  const [availableOptions, setAvailableOptions] = useState<
    { value: string; label: string }[]
  >([]);

  // Update availableOptions whenever selectedIds or teamMembersOptions/teamOptions change
  useEffect(() => {
    if (question.type === 'Team Member Selection') {
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
    }
  }, [
    selectedIds,
    teamMembersOptions,
    teamOptions,
    assessmentGranularity,
    question.type,
  ]);

  // Type Guard to check if question is scored
  const isScoredQuestion = (
    question: QuestionUnion
  ): question is
    | MultipleChoiceQuestion
    | MultipleResponseQuestion
    | ScaleQuestion
    | NumberQuestion => {
    return (
      (question.type === 'Multiple Choice' ||
        question.type === 'Multiple Response' ||
        question.type === 'Scale' ||
        question.type === 'Number') &&
      question.isScored === true
    );
  };

  // Extract the per-question score if available (for faculty)
  let perQuestionScore: number | null = null;

  if (isFaculty && isScoredQuestion(question) && submission) {
    const answerInSubmission = submission.answers.find(
      ans => ans.question.toString() === question._id.toString()
    );
    perQuestionScore = answerInSubmission?.score || 0;
  }

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
      <Text color="gray" size="sm" mb="xs">
        {customInstruction}
      </Text>

      {/* Question text with numbering */}
      <Text mb="sm">
        {index + 1}. {questionText}
      </Text>

      {/* Display per-question score for faculty */}
      {perQuestionScore !== null && (
        <Badge color="green" variant="light" mb="sm">
          Score: {perQuestionScore}
        </Badge>
      )}

      {/* Team Member Selection */}
      {questionType === 'Team Member Selection' && (
        <>
          <Group gap="xs" mb="sm">
            {teamMembersOptions &&
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
            {teamOptions &&
              selectedIds.map(teamId => {
                const team = teamOptions.find(
                  option => option.value === teamId
                );
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
      )}

      {/* Render other question types as before */}
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
                label={option.text}
                checked={answer === option.text}
                onChange={() => onAnswerChange(option.text)}
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
            const multipleResponseAnswer = Array.isArray(answer)
              ? (answer as string[])
              : [];
            const isChecked = multipleResponseAnswer.includes(option.text);

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
                  label={option.text}
                  checked={isChecked}
                  onChange={() => {
                    if (multipleResponseAnswer.includes(option.text)) {
                      // Remove the option
                      const updatedAnswers = multipleResponseAnswer.filter(
                        a => a !== option.text
                      );
                      onAnswerChange(updatedAnswers);
                    } else {
                      // Add the option
                      const updatedAnswers = [
                        ...multipleResponseAnswer,
                        option.text,
                      ];
                      onAnswerChange(updatedAnswers);
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
              typeof answer === 'number'
                ? answer
                : (question as ScaleQuestion).labels[0].value
            }
            min={(question as ScaleQuestion).labels[0].value}
            max={(question as ScaleQuestion).scaleMax}
            marks={(question as ScaleQuestion).labels.map(label => ({
              value: label.value,
              label: label.label,
            }))}
            step={1}
            style={{ padding: '0 20px', marginBottom: '20px' }}
            onChange={value => onAnswerChange(value)}
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
            (question as ShortResponseQuestion).shortResponsePlaceholder ||
            'Enter your response here...'
          }
          value={typeof answer === 'string' ? answer : ''}
          onChange={e => onAnswerChange(e.currentTarget.value)}
          disabled={disabled}
        />
      )}

      {questionType === 'Long Response' && (
        <Textarea
          placeholder={
            (question as LongResponseQuestion).longResponsePlaceholder ||
            'Enter your response here...'
          }
          value={typeof answer === 'string' ? answer : ''}
          onChange={e => onAnswerChange(e.currentTarget.value)}
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
                    .map(date => (date ? date.toLocaleDateString() : 'N/A'))
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
                  Array.isArray(answer) &&
                  (answer as [Date | null, Date | null]).every(Boolean)
                    ? (answer as [Date, Date])
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
                value={answer instanceof Date ? answer : null}
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
          value={typeof answer === 'number' ? answer : undefined}
          onChange={value => onAnswerChange(value)}
          style={{ marginBottom: '16px' }}
          disabled={disabled}
        />
      )}
    </Box>
  );
};

export default TakeAssessmentCard;
