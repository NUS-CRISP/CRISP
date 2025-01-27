import React from 'react';
import { Box, Text, Group, Badge } from '@mantine/core';
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
import { AnswerInput } from '@shared/types/AnswerInput';
import { Submission } from '@shared/types/Submission';
import TakeDateQuestionView from './TakeAssessmentCardComponents/TakeDateQuestionView';
import TakeLongResponseQuestionView from './TakeAssessmentCardComponents/TakeLongResponseQuestionView';
import TakeMultipleChoiceQuestionView from './TakeAssessmentCardComponents/TakeMultipleChoiceQuestionView';
import TakeMultipleResponseQuestionView from './TakeAssessmentCardComponents/TakeMultipleResponseQuestionView';
import TakeNumberQuestionView from './TakeAssessmentCardComponents/TakeNumberQuestionView';
import TakeScaleQuestionView from './TakeAssessmentCardComponents/TakeScaleQuestionView';
import TakeShortResponseQuestionView from './TakeAssessmentCardComponents/TakeShortResponseQuestionView';
import TakeTeamMemberSelectionQuestionView from './TakeAssessmentCardComponents/TakeTeamMemberSelectionQuestionView';

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
      <Text c="gray" size="sm" mb="xs">
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

      {/* Render based on question type */}
      {questionType === 'Multiple Choice' && (
        <TakeMultipleChoiceQuestionView
          question={question as MultipleChoiceQuestion}
          answer={answer}
          onAnswerChange={onAnswerChange}
          disabled={disabled}
        />
      )}

      {questionType === 'Multiple Response' && (
        <TakeMultipleResponseQuestionView
          question={question as MultipleResponseQuestion}
          answer={answer}
          onAnswerChange={onAnswerChange}
          disabled={disabled}
        />
      )}

      {questionType === 'Scale' && (
        <TakeScaleQuestionView
          question={question as ScaleQuestion}
          answer={answer}
          onAnswerChange={onAnswerChange}
          disabled={disabled}
        />
      )}

      {(questionType === 'Short Response' ||
        questionType === 'NUSNET ID' ||
        questionType === 'NUSNET Email') && (
        <TakeShortResponseQuestionView
          question={question as ShortResponseQuestion}
          answer={answer}
          onAnswerChange={onAnswerChange}
          disabled={disabled}
        />
      )}

      {questionType === 'Long Response' && (
        <TakeLongResponseQuestionView
          question={question as LongResponseQuestion}
          answer={answer}
          onAnswerChange={onAnswerChange}
          disabled={disabled}
        />
      )}

      {questionType === 'Date' && (
        <TakeDateQuestionView
          question={question as DateQuestion}
          answer={answer}
          onAnswerChange={onAnswerChange}
          disabled={disabled}
        />
      )}

      {questionType === 'Number' && (
        <TakeNumberQuestionView
          question={question as NumberQuestion}
          answer={answer}
          onAnswerChange={onAnswerChange}
          disabled={disabled}
        />
      )}

      {questionType === 'Team Member Selection' && (
        <TakeTeamMemberSelectionQuestionView
          answer={answer}
          onAnswerChange={onAnswerChange}
          disabled={disabled}
          teamMembersOptions={teamMembersOptions}
          teamOptions={teamOptions}
          assessmentGranularity={assessmentGranularity}
        />
      )}
    </Box>
  );
};

export default TakeAssessmentCard;
