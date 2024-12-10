import React, { useState, useEffect } from 'react';
import {
  Box,
  TextInput,
  Checkbox,
  Button,
  Group,
  ActionIcon,
  Text,
} from '@mantine/core';
import { IconTrash, IconPlus } from '@tabler/icons-react';
import { MultipleResponseQuestion } from '@shared/types/Question';

interface MultipleResponseQuestionEditProps {
  questionData: MultipleResponseQuestion;
  onSave: (updatedData: Partial<MultipleResponseQuestion>) => void;
  onDelete: () => void;
  isValid: boolean;
}

const MultipleResponseQuestionEdit: React.FC<
  MultipleResponseQuestionEditProps
> = ({ questionData, onSave, onDelete, isValid }) => {
  const [options, setOptions] = useState<string[]>([]);
  const [isScored, setIsScored] = useState<boolean>(
    questionData.isScored || false
  );
  const [optionPoints, setOptionPoints] = useState<number[]>([]);
  const [isOptionWrong, setIsOptionWrong] = useState<boolean[]>([]);

  // States for scoring behavior
  const [allowPartialMarks, setAllowPartialMarks] = useState<boolean>(
    questionData.allowPartialMarks || false
  );
  const [areWrongAnswersPenalized, setAreWrongAnswersPenalized] =
    useState<boolean>(questionData.areWrongAnswersPenalized || false);
  const [allowNegative, setAllowNegative] = useState<boolean>(
    questionData.allowNegative || false
  );

  useEffect(() => {
    if (questionData.options) {
      setOptions(questionData.options.map(option => option.text));
      setOptionPoints(
        questionData.options.map(option => Math.abs(option.points || 0))
      );
      setIsOptionWrong(
        questionData.options.map(option => (option.points || 0) < 0)
      );
    }
  }, [questionData]);

  // Adjusting states based on prerequisites:
  // If partial marks are not allowed, disable penalties and negative scores.
  useEffect(() => {
    if (!allowPartialMarks) {
      // Can't penalize wrong answers without partial marks
      setAreWrongAnswersPenalized(false);
      setAllowNegative(false);
    }
  }, [allowPartialMarks]);

  // If not penalizing wrong answers, disable negative scores
  useEffect(() => {
    if (!areWrongAnswersPenalized) {
      setAllowNegative(false);
    }
  }, [areWrongAnswersPenalized]);

  const handleAddOption = () => {
    setOptions([...options, '']);
    setOptionPoints([...optionPoints, 0]);
    setIsOptionWrong([...isOptionWrong, false]);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleOptionPointsChange = (index: number, value: number) => {
    const newPoints = [...optionPoints];
    newPoints[index] = value;
    setOptionPoints(newPoints);
  };

  const handleOptionWrongChange = (index: number, value: boolean) => {
    const newIsOptionWrong = [...isOptionWrong];
    newIsOptionWrong[index] = value;
    setIsOptionWrong(newIsOptionWrong);
  };

  const handleDeleteOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
    setOptionPoints(optionPoints.filter((_, i) => i !== index));
    setIsOptionWrong(isOptionWrong.filter((_, i) => i !== index));
  };

  const saveOptions = () => {
    const updatedOptions = options.map((text, index) => {
      let points = 0;
      if (isScored) {
        const basePoints = Math.abs(optionPoints[index] || 0);

        if (areWrongAnswersPenalized && isOptionWrong[index]) {
          // Wrong answer scenario
          if (allowNegative) {
            points = -basePoints; // Negative marking allowed
          } else {
            points = 0; // Penalized but not negative
          }
        } else {
          // Correct answer or no penalty scenario
          points = basePoints;
        }
      }
      return { text, points };
    });

    onSave({
      options: updatedOptions,
      isScored,
      areWrongAnswersPenalized,
      allowNegative,
      allowPartialMarks,
    });
  };

  return (
    <Box mb="md">
      <Checkbox
        label="Enable Scoring"
        checked={isScored}
        onChange={e => setIsScored(e.currentTarget.checked)}
        mb="sm"
      />
      {isScored && (
        <>
          <Checkbox
            label="Allow Partial Marking"
            checked={allowPartialMarks}
            onChange={e => setAllowPartialMarks(e.currentTarget.checked)}
            mb="sm"
          />
          <Checkbox
            label="Penalize Wrong Answers (Add penalty in the score box)"
            checked={areWrongAnswersPenalized}
            onChange={e => setAreWrongAnswersPenalized(e.currentTarget.checked)}
            mb="sm"
            disabled={!allowPartialMarks}
          />
          <Checkbox
            label="Allow Negative Scores"
            checked={allowNegative}
            onChange={e => setAllowNegative(e.currentTarget.checked)}
            mb="sm"
            disabled={!areWrongAnswersPenalized} // Requires penalty first
          />
        </>
      )}

      <Text fw={500} mb="sm">
        Options:
      </Text>
      {options.map((option, index) => (
        <Group key={index} mb="xs">
          <TextInput
            placeholder="Option text"
            value={option}
            onChange={e => handleOptionChange(index, e.currentTarget.value)}
            style={{ flex: 2 }}
          />
          {isScored && (
            <TextInput
              placeholder="Points"
              type="number"
              value={optionPoints[index]}
              onChange={e =>
                handleOptionPointsChange(
                  index,
                  parseFloat(e.currentTarget.value)
                )
              }
              style={{ width: '80px' }}
            />
          )}
          {isScored && allowPartialMarks && areWrongAnswersPenalized && (
            <Checkbox
              label="Wrong Answer"
              checked={isOptionWrong[index]}
              onChange={e =>
                handleOptionWrongChange(index, e.currentTarget.checked)
              }
            />
          )}
          <ActionIcon color="red" onClick={() => handleDeleteOption(index)}>
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      ))}
      <Group>
        <Button
          variant="light"
          color="blue"
          leftSection={<IconPlus size={16} />}
          onClick={handleAddOption}
          mt="md"
        >
          Add Option
        </Button>
        <Button
          onClick={saveOptions}
          mt="md"
          disabled={
            !isValid ||
            options.length < 1 ||
            options.some(option => option.trim() === '')
          }
        >
          Save Question
        </Button>
        <Button onClick={onDelete} color="red" mt="md">
          Delete Question
        </Button>
      </Group>
    </Box>
  );
};

export default MultipleResponseQuestionEdit;
