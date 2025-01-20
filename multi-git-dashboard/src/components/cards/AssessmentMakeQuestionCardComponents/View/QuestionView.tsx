import React from 'react';
import { Box, Button, Text, Group, Badge } from '@mantine/core';
import { QuestionUnion } from '@shared/types/Question';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import DateQuestionView from './DateQuestionView';
import LongResponseQuestionView from './LongResponseQuestionView';
import MultipleChoiceQuestionView from './MultipleChoiceQuestionView';
import MultipleResponseQuestionView from './MultipleResponseQuestionView';
import NumberQuestionView from './NumberQuestionView';
import ScaleQuestionView from './ScaleQuestionView';
import ShortResponseQuestionView from './ShortResponseQuestionView';
import TeamMemberSelectionQuestionView from './TeamMemberSelectionQuestionView';

interface QuestionViewProps {
  questionData: QuestionUnion;
  index: number;
  onDelete: () => void;
  onEdit: () => void;
  isLocked: boolean;
}

const QuestionView: React.FC<QuestionViewProps> = ({
  questionData,
  index,
  onDelete,
  onEdit,
  isLocked,
}) => {
  const isRequired = questionData.isRequired || false;
  const questionType = questionData.type;
  const questionText = questionData.text || '';
  const customInstruction = questionData.customInstruction || '';

  // 'Undecided' question type does not have a view component
  if (questionType === 'Undecided') {
    return null;
  }

  return (
    <Box
      p="md"
      mb="md"
      style={{ border: '1px solid #ccc', borderRadius: '8px' }}
    >
      {/* Top Badges */}
      <Group justify="space-between" mb="sm">
        <Badge color={isRequired ? 'red' : 'blue'} size="sm">
          {isRequired ? 'Required' : 'Optional'}
        </Badge>
        <Badge color={isLocked ? 'red' : 'blue'} size="sm">
          {isLocked ? 'Locked' : questionType}
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

      {/* Render based on question type */}
      {questionType === 'Multiple Choice' ? (
        <MultipleChoiceQuestionView questionData={questionData} />
      ) : null}

      {questionType === 'Multiple Response' ? (
        <MultipleResponseQuestionView questionData={questionData} />
      ) : null}

      {questionType === 'Scale' ? (
        <ScaleQuestionView questionData={questionData} />
      ) : null}

      {questionType === 'Short Response' ||
      questionType === 'NUSNET ID' ||
      questionType === 'NUSNET Email' ? (
        <ShortResponseQuestionView questionData={questionData} />
      ) : null}

      {questionType === 'Long Response' ? (
        <LongResponseQuestionView questionData={questionData} />
      ) : null}

      {questionType === 'Date' ? (
        <DateQuestionView questionData={questionData} />
      ) : null}

      {questionType === 'Number' ? (
        <NumberQuestionView questionData={questionData} />
      ) : null}

      {questionType === 'Team Member Selection' ? (
        <TeamMemberSelectionQuestionView />
      ) : null}

      {/* Edit and Delete buttons */}
      {!isLocked && (
        <Group mt="md">
          <Button
            variant="light"
            color="blue"
            leftSection={<IconPencil size={16} />}
            onClick={onEdit}
          >
            Edit Question
          </Button>
          <Button
            color="red"
            leftSection={<IconTrash size={16} />}
            onClick={onDelete}
          >
            Delete Question
          </Button>
        </Group>
      )}
    </Box>
  );
};

export default QuestionView;
