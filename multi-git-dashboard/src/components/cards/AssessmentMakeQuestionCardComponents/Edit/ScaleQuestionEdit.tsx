import React, { useState, useEffect } from 'react';
import {
  Box,
  TextInput,
  Button,
  Group,
  Checkbox,
  ActionIcon,
  Text,
  Slider,
} from '@mantine/core';
import { IconTrash, IconPlus } from '@tabler/icons-react';
import { ScaleQuestion, ScaleLabel } from '@shared/types/Question';

interface ScaleQuestionEditProps {
  questionData: ScaleQuestion;
  onSave: (updatedData: Partial<ScaleQuestion>) => void;
  onDelete: () => void;
  isValid: boolean;
}

const ScaleQuestionEdit: React.FC<ScaleQuestionEditProps> = ({
  questionData,
  onSave,
  onDelete,
  isValid,
}) => {
  const [isScored, setIsScored] = useState<boolean>(
    questionData.isScored || false
  );
  const [scaleMin, setScaleMin] = useState<number>(questionData.scaleMin || 0);
  const [scaleMax, setScaleMax] = useState<number>(questionData.scaleMax || 5);
  const [tempScaleMin, setTempScaleMin] = useState<string>(scaleMin.toString());
  const [tempScaleMax, setTempScaleMax] = useState<string>(scaleMax.toString());

  const [minLabel, setMinLabel] = useState<ScaleLabel>({
    value: scaleMin,
    label: questionData.labels ? questionData.labels[0].label || '' : '',
    points: questionData.labels ? questionData.labels[0].points || 0 : 0,
  });
  const [maxLabel, setMaxLabel] = useState<ScaleLabel>({
    value: scaleMax,
    label: questionData.labels
      ? questionData.labels[questionData.labels.length - 1].label || ''
      : '',
    points: questionData.labels ? questionData.labels[questionData.labels.length - 1].points || 0 : 0,
  });
  const [intermediateLabels, setIntermediateLabels] = useState<ScaleLabel[]>(
    questionData.labels ? questionData.labels.slice(1, -1) || [] : []
  );

  const [scaleValue, setScaleValue] = useState<number>(scaleMin);
  const [isScaleValid, setIsScaleValid] = useState<boolean>(isValid);

  // Validation
  useEffect(() => {
    const isValidScale = scaleMin < scaleMax;
    const minLabelValid = minLabel.label.trim() !== '';
    const maxLabelValid = maxLabel.label.trim() !== '';
    const intermediatesValid = intermediateLabels.every(
      label =>
        label.value > scaleMin &&
        label.value < scaleMax &&
        label.label.trim() !== ''
    );
    setIsScaleValid(
      isValid &&
        isValidScale &&
        minLabelValid &&
        maxLabelValid &&
        intermediatesValid
    );
  }, [
    scaleMin,
    scaleMax,
    minLabel,
    maxLabel,
    intermediateLabels,
    setIsScaleValid,
  ]);

  // Adjust minLabel and maxLabel values when scaleMin and scaleMax change
  useEffect(() => {
    setMinLabel(prev => ({ ...prev, value: scaleMin }));
    setMaxLabel(prev => ({ ...prev, value: scaleMax }));
    // Remove intermediate labels that are out of bounds
    setIntermediateLabels(prev =>
      prev.filter(label => label.value > scaleMin && label.value < scaleMax)
    );
  }, [scaleMin, scaleMax]);

  const handleAddIntermediateLabel = () => {
    const existingValues = [
      minLabel.value,
      ...intermediateLabels.map(l => l.value),
      maxLabel.value,
    ];
    let newValue = Math.floor((scaleMin + scaleMax) / 2);
    // Find a value that is not already used
    while (existingValues.includes(newValue) && newValue < scaleMax) {
      newValue += 1;
    }
    if (newValue >= scaleMax) {
      alert('Cannot add more intermediate labels.');
      return;
    }
    setIntermediateLabels([
      ...intermediateLabels,
      { value: newValue, label: '', points: 0 },
    ]);
  };

  const handleDeleteIntermediateLabel = (index: number) => {
    setIntermediateLabels(intermediateLabels.filter((_, i) => i !== index));
  };

  const saveScale = () => {
    const labels = [minLabel, ...intermediateLabels, maxLabel];
    // Sort labels by value
    const sortedLabels = labels.sort((a, b) => a.value - b.value);
    onSave({
      scaleMin,
      scaleMax,
      labels: sortedLabels,
      isScored,
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

      {/* Min Scale Value and Label */}
      <Group mb="sm">
        <TextInput
          label="Min Scale Value"
          type="number"
          value={tempScaleMin}
          onChange={e => setTempScaleMin(e.currentTarget.value)}
          onBlur={() => {
            const value = parseInt(tempScaleMin, 10);
            if (!isNaN(value) && value < scaleMax) {
              setScaleMin(value);
            } else {
              alert('Invalid minimum scale value.');
              setTempScaleMin(scaleMin.toString());
            }
          }}
          style={{ width: '120px' }}
        />
        <TextInput
          label="Min Label"
          placeholder="Enter min label"
          value={minLabel.label}
          onChange={e =>
            setMinLabel({ ...minLabel, label: e.currentTarget.value })
          }
          style={{ flex: 1 }}
        />
        {isScored && (
          <TextInput
            label="Points"
            type="number"
            value={minLabel.points}
            onChange={e =>
              setMinLabel({
                ...minLabel,
                points: parseFloat(e.currentTarget.value),
              })
            }
            style={{ width: '80px' }}
            disabled
          />
        )}
      </Group>

      {/* Intermediate Labels */}
      {intermediateLabels.map((label, index) => (
        <Group key={index} mb="sm">
          <TextInput
            label={'Value'}
            type="number"
            value={label.value}
            onChange={e => {
              const newValue = parseInt(e.currentTarget.value, 10);
              if (newValue > scaleMin && newValue < scaleMax) {
                const newLabels = [...intermediateLabels];
                newLabels[index].value = newValue;
                setIntermediateLabels(newLabels);
              } else {
                alert(
                  'Intermediate value must be between min and max scale values.'
                );
              }
            }}
            style={{ width: '120px' }}
          />
          <TextInput
            label="Label"
            placeholder="Enter label"
            value={label.label}
            onChange={e => {
              const newLabels = [...intermediateLabels];
              newLabels[index].label = e.currentTarget.value;
              setIntermediateLabels(newLabels);
            }}
            style={{ flex: 1 }}
          />
          {isScored && (
            <TextInput
              label="Points"
              type="number"
              value={label.points}
              onChange={e => {
                const newLabels = [...intermediateLabels];
                newLabels[index].points = parseFloat(e.currentTarget.value);
                setIntermediateLabels(newLabels);
              }}
              style={{ width: '80px' }}
            />
          )}
          <ActionIcon
            color="red"
            onClick={() => handleDeleteIntermediateLabel(index)}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      ))}

      <Button
        variant="light"
        color="blue"
        leftSection={<IconPlus size={16} />}
        onClick={handleAddIntermediateLabel}
        mt="sm"
      >
        Add Intermediate Label
      </Button>

      {/* Max Scale Value and Label */}
      <Group mt="md">
        <TextInput
          label="Max Scale Value"
          type="number"
          value={tempScaleMax}
          onChange={e => setTempScaleMax(e.currentTarget.value)}
          onBlur={() => {
            const value = parseInt(tempScaleMax, 10);
            if (!isNaN(value) && value > scaleMin) {
              setScaleMax(value);
            } else {
              alert('Invalid maximum scale value.');
              setTempScaleMax(scaleMax.toString());
            }
          }}
          style={{ width: '120px' }}
        />
        <TextInput
          label="Max Label"
          placeholder="Enter max label"
          value={maxLabel.label}
          onChange={e =>
            setMaxLabel({ ...maxLabel, label: e.currentTarget.value })
          }
          style={{ flex: 1 }}
        />
        {isScored && (
          <TextInput
            label="Points"
            type="number"
            value={maxLabel.points}
            onChange={e =>
              setMaxLabel({
                ...maxLabel,
                points: parseFloat(e.currentTarget.value),
              })
            }
            style={{ width: '80px' }}
          />
        )}
      </Group>

      {/* Preview Section */}
      <Box style={{ marginTop: '24px', marginBottom: '48px' }}>
        <Text style={{ fontWeight: 'bold', marginBottom: '8px' }}>
          Preview:
        </Text>
        <Slider
          value={scaleValue}
          min={scaleMin}
          max={scaleMax}
          marks={[
            { value: minLabel.value, label: minLabel.label },
            ...intermediateLabels
              .sort((a, b) => a.value - b.value)
              .map(label => ({
                value: label.value,
                label: label.label,
              })),
            { value: maxLabel.value, label: maxLabel.label },
          ]}
          step={1}
          onChange={setScaleValue}
          style={{ padding: '0 20px', marginBottom: '20px' }}
        />
      </Box>

      <Group mt="md">
        <Button onClick={saveScale} disabled={!isScaleValid}>
          Save Question
        </Button>
        <Button onClick={onDelete} color="red">
          Delete Question
        </Button>
      </Group>
    </Box>
  );
};

export default ScaleQuestionEdit;
