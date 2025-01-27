import React, { useState, useEffect } from 'react';
import {
  Box,
  Text,
  TextInput,
  Checkbox,
  Button,
  Group,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { IconTrash, IconPlus, IconHelpCircle } from '@tabler/icons-react';
import { MultipleChoiceQuestion } from '@shared/types/Question';

interface MultipleChoiceQuestionEditProps {
  questionData: MultipleChoiceQuestion;
  onSave: (updatedData: Partial<MultipleChoiceQuestion>) => void;
  onDelete: () => void;
  isValid: boolean;
}

const MultipleChoiceQuestionEdit: React.FC<MultipleChoiceQuestionEditProps> = ({
  questionData,
  onSave,
  onDelete,
  isValid,
}) => {
  const [options, setOptions] = useState<string[]>([]);
  const [isScored, setIsScored] = useState<boolean>(false);
  const [optionPoints, setOptionPoints] = useState<number[]>([]);

  useEffect(() => {
    if (questionData.options) {
      setOptions(questionData.options.map(option => option.text));
      setOptionPoints(questionData.options.map(option => option.points || 0));
    }
    setIsScored(questionData.isScored || false);
  }, [questionData]);

  const handleAddOption = () => {
    setOptions([...options, '']);
    setOptionPoints([...optionPoints, 0]);
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

  const handleDeleteOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
    setOptionPoints(optionPoints.filter((_, i) => i !== index));
  };

  const saveOptions = () => {
    const updatedOptions = options.map((text, index) => ({
      text,
      points: isScored ? optionPoints[index] || 0 : 0,
    }));

    onSave({
      options: updatedOptions,
      isScored,
    });
  };

  return (
    <Box mb="md">
      {/* Enable Scoring with Tooltip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: 16,
        }}
      >
        <Checkbox
          label="Enable Scoring"
          checked={isScored}
          onChange={e => setIsScored(e.currentTarget.checked)}
        />
        <Tooltip
          label="Enables auto-grading of the selected option."
          position="right"
          withArrow
          w={260}
          multiline
        >
          <span style={{ cursor: 'pointer', display: 'inline-flex' }}>
            <IconHelpCircle size={18} />
          </span>
        </Tooltip>
      </div>

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
            !isValid &&
            (options.length < 2 || options.some(option => option.trim() === ''))
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

export default MultipleChoiceQuestionEdit;
