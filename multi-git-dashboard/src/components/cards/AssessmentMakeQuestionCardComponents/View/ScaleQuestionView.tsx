import React, { useState } from 'react';
import { Slider, Box } from '@mantine/core';
import { ScaleQuestion, ScaleLabel } from '@shared/types/Question';

// Example: “styles” object for this component only
const scaleQuestionStyles = {
  labelContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 16, // your desired spacing
  },
  labelItem: {
    width: 60,
    textAlign: 'center',
    whiteSpace: 'normal',
    wordWrap: 'break-word',
    fontSize: 14,
    lineHeight: 1.2,
  },
};

interface ScaleQuestionViewProps {
  questionData: ScaleQuestion;
}

const ScaleQuestionView: React.FC<ScaleQuestionViewProps> = ({
  questionData,
}) => {
  const { scaleMin, scaleMax, labels } = questionData;
  const [scaleValue, setScaleValue] = useState<number>(scaleMin);

  return (
    <Box mb="xl">
      <Slider
        value={scaleValue}
        min={scaleMin}
        max={scaleMax}
        step={1}
        // Hide Mantine's built-in labels so we don't deal with absolute positioning
        marks={labels.map((label: ScaleLabel) => ({
          value: label.value,
          label: '',
        }))}
        onChange={setScaleValue}
        style={{ padding: '0 20px' }}
      />

      {/* Render labels in a normal flow row */}
      <div style={scaleQuestionStyles.labelContainer as React.CSSProperties}>
        {labels.map((label: ScaleLabel) => (
          <div
            key={label.value}
            style={scaleQuestionStyles.labelItem as React.CSSProperties}
          >
            {label.label}
          </div>
        ))}
      </div>
    </Box>
  );
};

export default ScaleQuestionView;
