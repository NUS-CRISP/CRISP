import React, { useState } from 'react';
import {
  Box,
  TextInput,
  Checkbox,
  Select,
  Button,
  Group,
  ActionIcon,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconTrash, IconPlus, IconHelpCircle } from '@tabler/icons-react';
import { NumberQuestion, NumberScoringRange } from '@shared/types/Question';

interface NumberQuestionEditProps {
  questionData: NumberQuestion;
  onSave: (updatedData: Partial<NumberQuestion>) => void;
  onDelete: () => void;
  isValid: boolean;
}

const NumberQuestionEdit: React.FC<NumberQuestionEditProps> = ({
  questionData,
  onSave,
  onDelete,
  isValid,
}) => {
  const [maxNumber, setMaxNumber] = useState<number>(
    questionData.maxNumber || 100
  );
  const [isScored, setIsScored] = useState<boolean>(
    questionData.isScored || false
  );
  const [scoringMethod, setScoringMethod] = useState<
    'direct' | 'range' | 'None'
  >(questionData.scoringMethod || 'None');
  const [maxPoints, setMaxPoints] = useState<number>(
    questionData.maxPoints || 0
  );
  const [scoringRanges, setScoringRanges] = useState<NumberScoringRange[]>(
    questionData.scoringRanges || []
  );

  const handleAddScoringRange = () => {
    setScoringRanges([
      ...scoringRanges,
      { minValue: 0, maxValue: 0, points: 0 },
    ]);
  };

  const handleScoringRangeChange = (
    index: number,
    field: keyof NumberScoringRange,
    value: number
  ) => {
    const updatedRanges = [...scoringRanges];
    updatedRanges[index] = { ...updatedRanges[index], [field]: value };
    setScoringRanges(updatedRanges);
  };

  const handleDeleteScoringRange = (index: number) => {
    setScoringRanges(scoringRanges.filter((_, i) => i !== index));
  };

  const saveQuestion = () => {
    onSave({
      maxNumber,
      isScored,
      scoringMethod,
      maxPoints: scoringMethod === 'direct' ? maxPoints : undefined,
      scoringRanges: scoringMethod === 'range' ? scoringRanges : undefined,
    });
  };

  return (
    <Box mb="md">
      <TextInput
        label="Max Number"
        type="number"
        value={maxNumber}
        onChange={e => setMaxNumber(parseInt(e.currentTarget.value, 10))}
        mb="sm"
      />

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
          label="Enables auto-grading (linear or multirange-based)."
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

      {isScored && (
        <>
          <Select
            label="Scoring Method"
            value={scoringMethod}
            onChange={value =>
              setScoringMethod(value as 'direct' | 'range' | 'None')
            }
            data={[
              { value: 'direct', label: 'Direct' },
              { value: 'range', label: 'Range' },
            ]}
            mb="sm"
          />

          {scoringMethod === 'direct' && (
            <TextInput
              label="Max Points"
              type="number"
              value={maxPoints}
              onChange={e => setMaxPoints(parseFloat(e.currentTarget.value))}
              mb="sm"
            />
          )}

          {scoringMethod === 'range' && (
            <Box>
              <Text>Scoring Ranges:</Text>
              {scoringRanges.map((range, index) => (
                <Group key={index} mb="xs">
                  <TextInput
                    label="Min Value"
                    type="number"
                    value={range.minValue}
                    onChange={e =>
                      handleScoringRangeChange(
                        index,
                        'minValue',
                        parseFloat(e.currentTarget.value)
                      )
                    }
                    style={{ flex: 1 }}
                  />
                  <TextInput
                    label="Max Value"
                    type="number"
                    value={range.maxValue}
                    onChange={e =>
                      handleScoringRangeChange(
                        index,
                        'maxValue',
                        parseFloat(e.currentTarget.value)
                      )
                    }
                    style={{ flex: 1 }}
                  />
                  <TextInput
                    label="Points"
                    type="number"
                    value={range.points}
                    onChange={e =>
                      handleScoringRangeChange(
                        index,
                        'points',
                        parseFloat(e.currentTarget.value)
                      )
                    }
                    style={{ flex: 1 }}
                  />
                  <ActionIcon
                    color="red"
                    onClick={() => handleDeleteScoringRange(index)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              ))}
              <Button
                variant="light"
                color="blue"
                leftSection={<IconPlus size={16} />}
                onClick={handleAddScoringRange}
                mt="sm"
              >
                Add Scoring Range
              </Button>
            </Box>
          )}
        </>
      )}

      <Group mt="md">
        <Button onClick={saveQuestion} disabled={!isValid}>
          Save Question
        </Button>
        <Button onClick={onDelete} color="red">
          Delete Question
        </Button>
      </Group>
    </Box>
  );
};

export default NumberQuestionEdit;
