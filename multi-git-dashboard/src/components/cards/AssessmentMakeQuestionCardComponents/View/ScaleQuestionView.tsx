import React, { useState } from 'react';
import { Slider, Box } from '@mantine/core';
import { ScaleQuestion, ScaleLabel } from '@shared/types/Question';

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
        marks={[
          ...labels.map((label: ScaleLabel) => ({
            value: label.value,
            label: label.label,
          })),
        ]}
        step={1}
        onChange={setScaleValue}
        style={{ padding: '0 20px', marginBottom: '20px' }}
      />
    </Box>
  );
};

export default ScaleQuestionView;
