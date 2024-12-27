import React, { useEffect, useState } from 'react';
import { Box, TextInput, Select, Text, Group, Checkbox } from '@mantine/core';
import {
  QuestionUnion,
  MultipleChoiceQuestion,
  MultipleResponseQuestion,
  ScaleQuestion,
  ShortResponseQuestion,
  LongResponseQuestion,
  DateQuestion,
  NumberQuestion,
  UndecidedQuestion,
  NUSNETIDQuestion,
  NUSNETEmailQuestion,
  TeamMemberSelectionQuestion,
} from '@shared/types/Question';
import DateQuestionEdit from './DateQuestionEdit';
import LongResponseQuestionEdit from './LongResponseQuestionEdit';
import MultipleChoiceQuestionEdit from './MultipleChoiceQuestionEdit';
import MultipleResponseQuestionEdit from './MultipleResponseQuestionEdit';
import NumberQuestionEdit from './NumberQuestionEdit';
import ScaleQuestionEdit from './ScaleQuestionEdit';
import ShortResponseQuestionEdit from './ShortResponseQuestionEdit';
import TeamMemberSelectionQuestionEdit from './TeamMemberSelectionQuestionEdit';
import UndecidedQuestionEdit from './UndecidedQuestionEdit';

interface QuestionEditProps {
  questionData: QuestionUnion;
  index: number;
  onDelete: () => void;
  onSave: (updatedQuestion: QuestionUnion) => void;
}

const QuestionEdit: React.FC<QuestionEditProps> = ({
  questionData,
  index,
  onDelete,
  onSave,
}) => {
  // Determine if this question is new (unsaved) by checking its _id
  // If it's "temp-xxx" or undefined, we consider it new
  const isNewQuestion =
    !questionData._id || questionData._id.startsWith('temp-');

  const [questionType, setQuestionType] = useState<QuestionUnion['type']>(
    questionData.type
  );
  const [questionText, setQuestionText] = useState<string>(
    questionData.text || ''
  );
  const [customInstruction, setCustomInstruction] = useState<string>(
    questionData.customInstruction || ''
  );
  const [isRequired, setIsRequired] = useState<boolean>(
    questionData.isRequired || false
  );

  // New state to track if the child component is valid
  const [isChildValid, setIsChildValid] = useState<boolean>(true);

  // Handle saving the question
  const handleSave = (updatedData: Partial<QuestionUnion>) => {
    let updatedQuestion: QuestionUnion;

    switch (questionType) {
      case 'Multiple Choice':
        updatedQuestion = {
          ...questionData,
          ...updatedData,
          text: questionText,
          type: questionType,
          customInstruction,
          isRequired,
        } as MultipleChoiceQuestion;
        break;

      case 'Multiple Response':
        updatedQuestion = {
          ...questionData,
          ...updatedData,
          text: questionText,
          type: questionType,
          customInstruction,
          isRequired,
        } as MultipleResponseQuestion;
        break;

      case 'Scale':
        updatedQuestion = {
          ...questionData,
          ...updatedData,
          text: questionText,
          type: questionType,
          customInstruction,
          isRequired,
        } as ScaleQuestion;
        break;

      case 'Short Response':
        updatedQuestion = {
          ...questionData,
          ...updatedData,
          text: questionText,
          type: questionType,
          customInstruction,
          isRequired,
        } as ShortResponseQuestion;
        break;

      case 'Long Response':
        updatedQuestion = {
          ...questionData,
          ...updatedData,
          text: questionText,
          type: questionType,
          customInstruction,
          isRequired,
        } as LongResponseQuestion;
        break;

      case 'Date':
        updatedQuestion = {
          ...questionData,
          ...updatedData,
          text: questionText,
          type: questionType,
          customInstruction,
          isRequired,
        } as DateQuestion;
        break;

      case 'Number':
        updatedQuestion = {
          ...questionData,
          ...updatedData,
          text: questionText,
          type: questionType,
          customInstruction,
          isRequired,
        } as NumberQuestion;
        break;

      case 'Undecided':
        updatedQuestion = {
          ...questionData,
          text: questionText,
          type: questionType,
          customInstruction,
          isRequired,
        } as UndecidedQuestion;
        break;

      case 'NUSNET ID':
        updatedQuestion = {
          ...questionData,
          text: questionText || 'Student NUSNET ID (EXXXXXXX)',
          type: 'NUSNET ID',
          customInstruction,
          isRequired: true,
          isLocked: true,
        } as NUSNETIDQuestion;
        break;

      case 'NUSNET Email':
        updatedQuestion = {
          ...questionData,
          text: questionText || 'Student NUSNET Email',
          type: 'NUSNET Email',
          customInstruction,
          isRequired: true,
          isLocked: true,
        } as NUSNETEmailQuestion;
        break;

      case 'Team Member Selection':
        updatedQuestion = {
          ...questionData,
          text: questionText || 'Select team members to evaluate',
          type: 'Team Member Selection',
          customInstruction,
          isRequired: true,
          isLocked: true,
        } as TeamMemberSelectionQuestion;
        break;

      default:
        // Handle any unexpected types
        updatedQuestion = {
          ...questionData,
          ...updatedData,
          text: questionText,
          type: questionType,
          customInstruction,
          isRequired,
        } as QuestionUnion;
        break;
    }

    onSave(updatedQuestion);
  };

  useEffect(() => {
    if (questionText && questionText.trim() !== '') {
      setIsChildValid(true);
    } else {
      setIsChildValid(false);
    }
  }, [questionText]);

  return (
    <Box
      p="md"
      mb="md"
      style={{ border: '1px solid #ccc', borderRadius: '8px' }}
    >
      <Text size="sm" mb="xs">
        Question {index + 1}
      </Text>
      <Group mb="md">
        <TextInput
          label="Question"
          placeholder="Enter the question"
          value={questionText}
          onChange={e => setQuestionText(e.currentTarget.value)}
          required
          style={{ flex: 2 }}
        />
        <Select
          label="Question Type"
          value={questionType}
          onChange={value => setQuestionType(value as QuestionUnion['type'])}
          data={[
            {
              group: 'Auto-Grading Supported',
              items: [
                { value: 'Multiple Choice', label: 'Multiple Choice' },
                { value: 'Multiple Response', label: 'Multiple Response' },
                { value: 'Scale', label: 'Scale' },
                { value: 'Number', label: 'Number' },
              ],
            },
            {
              group: 'No Grading',
              items: [
                { value: 'Short Response', label: 'Short Response' },
                { value: 'Long Response', label: 'Long Response' },
                { value: 'Date', label: 'Date' },
                { value: 'Undecided', label: 'Undecided' },
              ],
            },
            // {
            //   group: 'Special Questions',
            //   items: [
            //     { value: 'NUSNET ID', label: 'NUSNET ID' },
            //     { value: 'NUSNET Email', label: 'NUSNET Email' },
            //     {
            //       value: 'Team Member Selection',
            //       label: 'Team Member Selection',
            //     },
            //   ],
            // },
          ]}
          required
          style={{ flex: 1 }}
          // Disable if not a new question
          disabled={!isNewQuestion}
        />
      </Group>

      <TextInput
        label="Instructions"
        placeholder="Enter instructions"
        value={customInstruction}
        onChange={e => setCustomInstruction(e.currentTarget.value)}
        mb="md"
      />

      <Checkbox
        label="Required"
        checked={isRequired}
        onChange={e => setIsRequired(e.currentTarget.checked)}
        mb="md"
      />

      {/* Render based on question type */}
      {questionType === 'Multiple Choice' && (
        <MultipleChoiceQuestionEdit
          questionData={questionData as MultipleChoiceQuestion}
          onSave={data => handleSave(data)}
          onDelete={onDelete}
          isValid={isChildValid}
        />
      )}

      {questionType === 'Multiple Response' && (
        <MultipleResponseQuestionEdit
          questionData={questionData as MultipleResponseQuestion}
          onSave={data => handleSave(data)}
          onDelete={onDelete}
          isValid={isChildValid}
        />
      )}

      {questionType === 'Scale' && (
        <ScaleQuestionEdit
          questionData={questionData as ScaleQuestion}
          onSave={data => handleSave(data)}
          onDelete={onDelete}
          isValid={isChildValid}
        />
      )}

      {(questionType === 'Short Response' ||
        questionType === 'NUSNET ID' ||
        questionType === 'NUSNET Email') && (
        <ShortResponseQuestionEdit
          questionData={questionData as ShortResponseQuestion}
          onSave={data => handleSave(data)}
          onDelete={onDelete}
          isValid={isChildValid}
        />
      )}

      {questionType === 'Long Response' && (
        <LongResponseQuestionEdit
          questionData={questionData as LongResponseQuestion}
          onSave={data => handleSave(data)}
          onDelete={onDelete}
          isValid={isChildValid}
        />
      )}

      {questionType === 'Date' && (
        <DateQuestionEdit
          questionData={questionData as DateQuestion}
          onSave={data => handleSave(data)}
          onDelete={onDelete}
          isValid={isChildValid}
        />
      )}

      {questionType === 'Number' && (
        <NumberQuestionEdit
          questionData={questionData as NumberQuestion}
          onSave={data => handleSave(data)}
          onDelete={onDelete}
          isValid={isChildValid}
        />
      )}

      {questionType === 'Team Member Selection' && (
        <TeamMemberSelectionQuestionEdit
          onSave={data => handleSave(data)}
          onDelete={onDelete}
        />
      )}

      {questionType === 'Undecided' && <UndecidedQuestionEdit />}
    </Box>
  );
};

export default QuestionEdit;
