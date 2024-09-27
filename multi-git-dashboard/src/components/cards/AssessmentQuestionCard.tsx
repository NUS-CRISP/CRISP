// AssessmentQuestionCard.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextInput,
  Select,
  Text,
  Group,
  Badge,
  Slider,
  Radio,
  Checkbox,
  Textarea,
} from '@mantine/core';
import { DatePicker, DatesRangeValue, DateValue } from '@mantine/dates';
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
} from '@shared/types/Question';
import { IconTrash, IconPencil } from '@tabler/icons-react';

interface AssessmentQuestionCardProps {
  questionData: QuestionUnion;
  onDelete: () => void;
  onSave: (updatedQuestion: QuestionUnion) => void;
  isLocked: boolean;
}

const AssessmentQuestionCard: React.FC<AssessmentQuestionCardProps> = ({
  questionData,
  onDelete,
  onSave,
  isLocked,
}) => {
  const isQuestionLocked = isLocked || questionData.isLocked || false;

  // Determine if this is a new question (temporary _id starting with 'temp-')
  const isNewQuestion = questionData._id.startsWith('temp-');

  // Start in edit mode if it's a new question or question type is 'Undecided'
  const [isEditing, setIsEditing] = useState<boolean>(isNewQuestion || questionData.type === 'Undecided');

  const [questionText, setQuestionText] = useState<string>(questionData.text || '');
  const [questionType, setQuestionType] = useState<QuestionUnion['type']>(questionData.type);
  const [customInstruction, setCustomInstruction] = useState<string>(questionData.customInstruction || '');

  // Additional state based on question type
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [scaleMax, setScaleMax] = useState<number>(5);
  const [scaleValue, setScaleValue] = useState<number>(1);
  const [labelMin, setLabelMin] = useState<string>('Low');
  const [labelMax, setLabelMax] = useState<string>('High');
  const [shortResponseValue, setShortResponseValue] = useState<string>(''); // For submission
  const [shortResponsePlaceholder, setShortResponsePlaceholder] = useState<string>(''); // For editing the placeholder
  const [longResponseValue, setLongResponseValue] = useState<string>(''); // For Long Response submission
  const [dateValue, setDateValue] = useState<DateValue>(null); // For Date Question (view mode)
  const [datesRangeValue, setDatesRangeValue] = useState<DatesRangeValue>(); // For Date Question (view mode)
  const [isRange, setIsRange] = useState<boolean>((questionData as DateQuestion).isRange || false); // Edit mode toggle
  const [datePickerPlaceholder, setDatePickerPlaceholder] = useState<string>(
    (questionData as DateQuestion).datePickerPlaceholder || ''
  );
  const [minDate, setMinDate] = useState<Date | null>((questionData as DateQuestion).minDate || null); // Edit mode
  const [maxDate, setMaxDate] = useState<Date | null>((questionData as DateQuestion).maxDate || null); // Edit mode
  const [numberValue, setNumberValue] = useState<number | undefined>((questionData as NumberQuestion).maxNumber || undefined); // Editable number value

  // Initialize state based on question type
  useEffect(() => {
    switch (questionType) {
      case 'Multiple Choice':
      case 'Multiple Response':
        if ('options' in questionData && questionData.options) {
          setOptions(questionData.options);
        } else {
          setOptions([]);
        }
        break;
      case 'Scale':
        if ('scaleMax' in questionData && 'labelMin' in questionData && 'labelMax' in questionData) {
          setScaleMax(questionData.scaleMax);
          setLabelMin(questionData.labelMin);
          setLabelMax(questionData.labelMax);
        } else {
          setScaleMax(5);
          setLabelMin('Low');
          setLabelMax('High');
        }
        break;
      case 'Short Response':
        setShortResponsePlaceholder((questionData as ShortResponseQuestion).shortResponsePlaceholder || '');
        setShortResponseValue(''); // Future submission handling
        break;
      case 'Long Response':
        setShortResponsePlaceholder((questionData as LongResponseQuestion).longResponsePlaceholder || '');
        setLongResponseValue(''); // Future submission handling
        break;
      case 'Date':
        // eslint-disable-next-line no-case-declarations
        const dateQuestion = questionData as DateQuestion;
        setIsRange(dateQuestion.isRange);
        setDatePickerPlaceholder(dateQuestion.datePickerPlaceholder || '');
        setMinDate(dateQuestion.minDate || null);
        setMaxDate(dateQuestion.maxDate || null);
        break;
      case 'Number':
        setNumberValue((questionData as NumberQuestion).maxNumber || undefined);
        break;
      default:
        break;
    }
  }, [questionType, questionData]);

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleDeleteOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };

  const toggleOption = (index: number) => {
    if (questionType === 'Multiple Choice') {
      setSelectedOptions(selectedOptions.includes(index) ? [] : [index]); // Only one can be selected at a time for MCQ
    } else if (questionType === 'Multiple Response') {
      setSelectedOptions((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
      ); // Toggle selection for MRQ
    }
  };

  const saveQuestion = () => {
    let updatedQuestion: QuestionUnion;

    switch (questionType) {
      case 'Multiple Choice':
        updatedQuestion = {
          ...questionData,
          text: questionText,
          type: questionType,
          options,
          customInstruction: customInstruction || getDefaultInstruction(),
          isLocked: questionData.isLocked || false,
        } as MultipleChoiceQuestion;
        break;
      case 'Multiple Response':
        updatedQuestion = {
          ...questionData,
          text: questionText,
          type: questionType,
          options,
          customInstruction: customInstruction || getDefaultInstruction(),
          isLocked: questionData.isLocked || false,
        } as MultipleResponseQuestion;
        break;
      case 'Scale':
        updatedQuestion = {
          ...questionData,
          text: questionText,
          type: questionType,
          scaleMax,
          labelMin,
          labelMax,
          customInstruction: customInstruction || getDefaultInstruction(),
          isLocked: questionData.isLocked || false,
        } as ScaleQuestion;
        break;
      case 'Short Response':
        updatedQuestion = {
          ...questionData,
          text: questionText,
          type: questionType,
          shortResponsePlaceholder,
          customInstruction: customInstruction || getDefaultInstruction(),
          isLocked: questionData.isLocked || false,
        } as ShortResponseQuestion;
        break;
      case 'Long Response':
        updatedQuestion = {
          ...questionData,
          text: questionText,
          type: questionType,
          longResponsePlaceholder: shortResponsePlaceholder,
          customInstruction: customInstruction || getDefaultInstruction(),
          isLocked: questionData.isLocked || false,
        } as LongResponseQuestion;
        break;
      case 'Date':
        updatedQuestion = {
          ...questionData,
          text: questionText,
          type: questionType,
          isRange,
          datePickerPlaceholder,
          minDate: minDate || undefined,
          maxDate: maxDate || undefined,
          customInstruction: customInstruction || getDefaultInstruction(),
          isLocked: questionData.isLocked || false,
        } as DateQuestion;
        break;
      case 'Number':
        updatedQuestion = {
          ...questionData,
          text: questionText,
          type: questionType,
          maxNumber: numberValue || 100,
          customInstruction: customInstruction || getDefaultInstruction(),
          isLocked: questionData.isLocked || false,
        } as NumberQuestion;
        break;
      case 'Undecided':
        updatedQuestion = {
          ...questionData,
          text: questionText,
          type: questionType,
          customInstruction: customInstruction || '',
          isLocked: questionData.isLocked || false,
        } as UndecidedQuestion;
        break;
      default:
        updatedQuestion = {
          ...questionData,
          text: questionText,
          type: questionType,
          isLocked: questionData.isLocked || false,
        } as QuestionUnion;
        break;
    }

    onSave(updatedQuestion);
    setIsEditing(false); // Switch to view mode after saving
  };

  const getDefaultInstruction = () => {
    switch (questionType) {
      case 'Multiple Choice':
        return 'Select the most appropriate answer.';
      case 'Multiple Response':
        return 'Select ALL appropriate answers.';
      case 'Scale':
        return 'Select the most accurate score.';
      case 'Short Response':
      case 'Long Response':
        return 'Provide a brief answer in the text box below.';
      case 'Date':
        return isRange ? 'Select a date range.' : 'Select a single date.';
      case 'Number':
        return `Enter a number (maximum: ${numberValue || 100}).`;
      default:
        return '';
    }
  };

  if (!isEditing) {
    // View mode
    return (
      <Box
        p="md"
        mb="md"
        style={{
          border: '1px solid #ccc',
          borderRadius: '8px',
          position: 'relative',
        }}
      >
        {/* Question type badge */}
        <Badge
          color={isQuestionLocked ? 'red' : 'blue'}
          size="sm"
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
          }}
        >
          {isQuestionLocked ? 'Locked' : questionType}
        </Badge>

        {/* Question instruction */}
        <Text color="gray" size="sm" mb="xs">
          {customInstruction || getDefaultInstruction()}
        </Text>

        {/* Question text */}
        <Text mb="sm">{questionText}</Text>

        {/* Render based on question type */}
        {questionType === 'Multiple Choice' || questionType === 'Multiple Response' ? (
          <Group align="stretch" style={{ flexGrow: 1, flexDirection: 'column' }}>
            {options.map((option, index) => (
              <Box
                key={index}
                p="xs"
                style={{
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                  width: '100%',
                }}
              >
                {questionType === 'Multiple Choice' ? (
                  <Radio
                    label={option}
                    checked={selectedOptions.includes(index)}
                    onChange={() => toggleOption(index)}
                    style={{ width: '100%' }}
                  />
                ) : (
                  <Checkbox
                    label={option}
                    checked={selectedOptions.includes(index)}
                    onChange={() => toggleOption(index)}
                    style={{ width: '100%' }}
                  />
                )}
              </Box>
            ))}
          </Group>
        ) : null}

        {questionType === 'Scale' ? (
          <>
            <Slider
              value={scaleValue}
              min={1}
              max={scaleMax}
              marks={[
                { value: 1, label: labelMin },
                { value: scaleMax, label: labelMax },
              ]}
              step={1}
              style={{ padding: '0 20px', marginBottom: '20px' }} // Add padding for better visual spacing
              onChange={setScaleValue}
            />
            <Box style={{ marginTop: '24px' }} />
          </>
        ) : null}

        {questionType === 'Short Response' && (
          <TextInput
            placeholder={shortResponsePlaceholder || 'Enter your response here...'}
            value={shortResponseValue}
            onChange={(e) => setShortResponseValue(e.currentTarget.value)}
            style={{ marginBottom: '16px' }}
          />
        )}

        {questionType === 'Long Response' && (
          <Textarea
            placeholder={shortResponsePlaceholder || 'Enter your response here...'}
            value={longResponseValue}
            onChange={(e) => setLongResponseValue(e.currentTarget.value)}
            minRows={5}
            autosize
            style={{ marginBottom: '16px' }}
          />
        )}

        {questionType === 'Date' && (
          <Box style={{ marginBottom: '16px' }}>
            {isRange ? (
              <Box>
                <Text>{datePickerPlaceholder || 'Select a date range'}</Text>
                <DatePicker
                  type="range"
                  style={{ marginTop: '8px', width: '100%' }}
                  minDate={minDate ? new Date(minDate) : undefined} // Convert minDate to Date object
                  maxDate={maxDate ? new Date(maxDate) : undefined} // Convert maxDate to Date object
                  value={datesRangeValue}
                  onChange={setDatesRangeValue}
                />
              </Box>
            ) : (
              <Box>
                <Text>{datePickerPlaceholder || 'Select a date'}</Text>
                <DatePicker
                  style={{ marginTop: '8px', width: '100%' }}
                  minDate={minDate ? new Date(minDate) : undefined} // Convert minDate to Date object
                  maxDate={maxDate ? new Date(maxDate) : undefined} // Convert maxDate to Date object
                  value={dateValue}
                  onChange={setDateValue}
                />
              </Box>
            )}
          </Box>
        )}

        {questionType === 'Number' ? (
          <TextInput
            type="number"
            placeholder={`Enter a number (Max: ${numberValue || 100})`}
            value={numberValue}
            onChange={(e) => setNumberValue(parseInt(e.currentTarget.value, 10))}
            style={{ marginBottom: '16px' }}
          />
        ) : null}

        {/* Delete and Edit buttons */}
        {!isQuestionLocked && (
          <Group style={{ marginTop: '16px', gap: '8px' }}>
            <Button
              variant="light"
              color="blue"
              leftSection={<IconPencil size={16} />}
              onClick={() => setIsEditing(true)}
            >
              Edit Question
            </Button>
            <Button color="red" leftSection={<IconTrash size={16} />} onClick={onDelete}>
              Delete Question
            </Button>
          </Group>
        )}
      </Box>
    );

  }

  // Edit mode
  return (
    <Box
      p="md"
      mb="md"
      style={{
        border: '1px solid #ccc',
        borderRadius: '8px',
      }}
    >
      <Group style={{ marginBottom: '16px' }}>
        <TextInput
          label="Question"
          placeholder="Enter the question"
          value={questionText}
          onChange={(e) => {
            setQuestionText(e.currentTarget.value);
          }}
          required
          style={{ flex: 2, marginRight: '8px' }}
        />

        <Select
          label="Question Type"
          value={questionType}
          onChange={(value) => {
            setQuestionType(value as QuestionUnion['type']);
          }}
          data={[
            { value: 'Undecided', label: 'Undecided' },
            { value: 'Multiple Choice', label: 'Multiple Choice' },
            { value: 'Multiple Response', label: 'Multiple Response' },
            { value: 'Scale', label: 'Scale' },
            { value: 'Short Response', label: 'Short Response' },
            { value: 'Long Response', label: 'Long Response' },
            { value: 'Date', label: 'Date' },
            { value: 'Number', label: 'Number' },
          ]}
          required
          style={{ flex: 1 }}
        />
      </Group>

      <TextInput
        label="Instructions"
        placeholder={getDefaultInstruction()}
        value={customInstruction}
        onChange={(e) => {
          setCustomInstruction(e.currentTarget.value);
        }}
        style={{ marginBottom: '16px' }}
      />

      {(questionType === 'Multiple Choice' || questionType === 'Multiple Response') && (
        <Box style={{ marginBottom: '16px' }}>
          <Text>Options:</Text>
          {options.map((option, index) => (
            <Group key={index} style={{ marginTop: '8px', gap: '8px' }}>
              <TextInput
                placeholder="Option text"
                value={option}
                onChange={(e) => handleOptionChange(index, e.currentTarget.value)}
                style={{ flex: 1 }}
              />
              <Button
                color="red"
                onClick={() => handleDeleteOption(index)}
                variant="subtle"
                size="xs"
                style={{ padding: '4px 8px' }}
              >
                Remove
              </Button>
            </Group>
          ))}
          <Button style={{ marginTop: '8px' }} onClick={handleAddOption}>
            Add Option
          </Button>
        </Box>
      )}

      {questionType === 'Scale' && (
        <Box style={{ marginBottom: '16px' }}>
          <Group style={{ marginBottom: '8px', gap: '8px' }}>
            <TextInput
              label="Minimum Label"
              value={labelMin}
              onChange={(e) => {
                setLabelMin(e.currentTarget.value);
              }}
              style={{ flex: 1 }}
            />
            <TextInput
              label="Maximum Label"
              value={labelMax}
              onChange={(e) => {
                setLabelMax(e.currentTarget.value);
              }}
              style={{ flex: 1 }}
            />
          </Group>
          <TextInput
            label="Max Scale Value"
            type="number"
            value={scaleMax}
            onChange={(e) => {
              setScaleMax(parseInt(e.currentTarget.value, 10));
              setScaleValue(Math.round(scaleMax / 2));
            }}
            placeholder="Enter maximum scale value"
            style={{ marginTop: '8px' }}
          />
        </Box>
      )}

      {questionType === 'Short Response' && (
        <Box style={{ marginBottom: '16px' }}>
          <TextInput
            label="Predefined Placeholder"
            placeholder="Customize the placeholder"
            value={shortResponsePlaceholder}
            onChange={(e) => {
              setShortResponsePlaceholder(e.currentTarget.value);
            }}
          />
          <Text style={{ marginTop: '8px', marginBottom: '4px' }}>Preview:</Text>
          <TextInput placeholder={shortResponsePlaceholder} disabled />
        </Box>
      )}

      {questionType === 'Long Response' && (
        <Box style={{ marginBottom: '16px' }}>
          <TextInput
            label="Predefined Placeholder"
            placeholder="Customize the placeholder"
            value={shortResponsePlaceholder}
            onChange={(e) => {
              setShortResponsePlaceholder(e.currentTarget.value);
            }}
          />
          <Text style={{ marginTop: '8px', marginBottom: '4px' }}>Preview:</Text>
          <Textarea
            placeholder={shortResponsePlaceholder || 'Enter your response here...'}
            minRows={5}
            disabled
          />
        </Box>
      )}

      {questionType === 'Date' && (
        <Box style={{ marginBottom: '16px' }}>
          <Group style={{ marginBottom: '8px' }}>
            <Checkbox
              label="Enable Date Range"
              checked={isRange}
              onChange={(e) => setIsRange(e.currentTarget.checked)}
            />
          </Group>

          <TextInput
            label="Date Picker Placeholder"
            placeholder="Customize the placeholder"
            value={datePickerPlaceholder}
            onChange={(e) => setDatePickerPlaceholder(e.currentTarget.value)}
            style={{ marginBottom: '16px' }}
          />

          <Group grow style={{ marginTop: '16px', gap: '16px' }}>
            <DatePicker
              placeholder="Select min date"
              value={minDate}
              onChange={(date) => setMinDate(date)}
            />
            <DatePicker
              placeholder="Select max date"
              value={maxDate}
              onChange={(date) => setMaxDate(date)}
            />
          </Group>
        </Box>
      )}

      {questionType === 'Number' && (
        <Box style={{ marginBottom: '16px' }}>
          <TextInput
            label="Max Number"
            type="number"
            value={numberValue}
            onChange={(e) => {
              setNumberValue(parseInt(e.currentTarget.value, 10));
            }}
            placeholder="Enter maximum allowed number"
          />
        </Box>
      )}

      <Group style={{ marginTop: '16px', gap: '8px' }}>
        <Button onClick={onDelete} color="red">
          Delete Question
        </Button>
        <Button onClick={saveQuestion} disabled={questionType === 'Undecided'}>
          Save Question
        </Button>
      </Group>
    </Box>
  );
};

export default AssessmentQuestionCard;
