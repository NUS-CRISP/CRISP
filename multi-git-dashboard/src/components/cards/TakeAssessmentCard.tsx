// components/cards/TakeAssessmentCard.tsx

import React from 'react';
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
}

const TakeAssessmentCard: React.FC<TakeAssessmentCardProps> = ({
  question,
  answer,
  onAnswerChange,
  index,
  disabled = false,
}) => {
  const questionType = question.type;
  const isRequired = question.isRequired || false;
  const customInstruction = question.customInstruction || '';
  const questionText = question.text || '';

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

      {questionType === 'Short Response' && (
        <TextInput
          placeholder={
            (question as ShortResponseQuestion).shortResponsePlaceholder ||
            'Enter your response here...'
          }
          value={answer !== undefined ? (answer as string) : ''}
          onChange={(e) => onAnswerChange(e.currentTarget.value)}
          style={{ marginBottom: '16px' }}
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
