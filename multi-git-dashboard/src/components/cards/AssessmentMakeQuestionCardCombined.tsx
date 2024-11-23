/* eslint-disable @typescript-eslint/no-explicit-any */

// NOTE: This is a combined version of AssessmentMakeQuestionCard with no folder structure.
// It techinically isn't being used at all.
// It also lacks save validation for missing question text.
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
  ActionIcon,
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
  ScaleLabel,
  NUSNETEmailQuestion,
  NUSNETIDQuestion,
  TeamMemberSelectionQuestion,
  NumberScoringRange,
} from '@shared/types/Question';
import { IconTrash, IconPencil, IconPlus } from '@tabler/icons-react';

interface AssessmentMakeQuestionCardProps {
  questionData: QuestionUnion;
  onDelete: () => void;
  onSave: (updatedQuestion: QuestionUnion) => void;
  isLocked: boolean;
  index: number;
}

const AssessmentMakeQuestionCard: React.FC<AssessmentMakeQuestionCardProps> = ({
  questionData,
  onDelete,
  onSave,
  isLocked,
  index,
}) => {
  const enableNewQuestionTypesForTesting = false; // Set to false in production
  const isQuestionLocked = isLocked || questionData.isLocked || false;

  // Determine if this is a new question (temporary _id starting with 'temp-')
  const isNewQuestion = questionData._id.startsWith('temp-');

  // Start in edit mode if it's a new question or question type is 'Undecided'
  const [isEditing, setIsEditing] = useState<boolean>(
    isNewQuestion || questionData.type === 'Undecided'
  );

  const [questionText, setQuestionText] = useState<string>(
    questionData.text || ''
  );
  const [questionType, setQuestionType] = useState<QuestionUnion['type']>(
    questionData.type
  );
  const [customInstruction, setCustomInstruction] = useState<string>(
    questionData.customInstruction || ''
  );
  const [isRequired, setIsRequired] = useState<boolean>(
    questionData.isRequired || false
  ); // New state for isRequired
  // State for scoring-type questions
  const [isScored, setIsScored] = useState<boolean>(
    (questionData as any).isScored || false
  );

  // Additional state based on question type

  // MCQ/MRQ
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [optionPoints, setOptionPoints] = useState<number[]>([]);
  // MRQ only
  const [subtractPointsForWrongAnswers, setSubtractPointsForWrongAnswers] =
    useState<boolean>(
      (questionData as MultipleResponseQuestion).allowNegative || false
    );
  const [isOptionWrong, setIsOptionWrong] = useState<boolean[]>([]);

  // Scale
  const [scaleMax, setScaleMax] = useState<number>(5);
  const [scaleValue, setScaleValue] = useState<number>(1);
  const [minLabel, setMinLabel] = useState<ScaleLabel>({
    value: 1,
    label: 'Low',
    points: 0,
  });
  const [maxLabel, setMaxLabel] = useState<ScaleLabel>({
    value: 5,
    label: 'High',
    points: 0,
  });
  const [intermediateLabels, setIntermediateLabels] = useState<ScaleLabel[]>(
    []
  );

  // Short & Long Response
  const [shortResponseValue, setShortResponseValue] = useState<string>(''); // For submission
  const [shortResponsePlaceholder, setShortResponsePlaceholder] =
    useState<string>(''); // For editing the placeholder
  const [longResponseValue, setLongResponseValue] = useState<string>(''); // For Long Response submission

  // Date
  const [dateValue, setDateValue] = useState<DateValue>(null); // For Date Question (view mode)
  const [datesRangeValue, setDatesRangeValue] = useState<DatesRangeValue>(); // For Date Question (view mode)
  const [isRange, setIsRange] = useState<boolean>(
    (questionData as DateQuestion).isRange || false
  ); // Edit mode toggle
  const [datePickerPlaceholder, setDatePickerPlaceholder] = useState<string>(
    (questionData as DateQuestion).datePickerPlaceholder || ''
  );
  const [minDate, setMinDate] = useState<Date | null>(
    (questionData as DateQuestion).minDate || null
  ); // Edit mode
  const [maxDate, setMaxDate] = useState<Date | null>(
    (questionData as DateQuestion).maxDate || null
  ); // Edit mode

  // Number
  const [numberValue, setNumberValue] = useState<number | undefined>(
    (questionData as NumberQuestion).maxNumber || undefined
  );
  const [scoringMethod, setScoringMethod] = useState<
    'direct' | 'range' | 'None'
  >((questionData as NumberQuestion).scoringMethod || 'None');
  const [maxPoints, setMaxPoints] = useState<number>(
    (questionData as NumberQuestion).maxPoints || 0
  );
  const [scoringRanges, setScoringRanges] = useState<NumberScoringRange[]>(
    (questionData as NumberQuestion).scoringRanges || []
  );

  // Temporary state for Max Scale Value as string to handle empty input and trimming
  const [tempScaleMax, setTempScaleMax] = useState<string>(scaleMax.toString());
  const [previousScaleMax, setPreviousScaleMax] = useState<number>(scaleMax);

  // Initialize state based on question type
  useEffect(() => {
    switch (questionType) {
      case 'Multiple Choice':
      case 'Multiple Response':
        if ('options' in questionData && questionData.options) {
          console.log(questionData.options);
          setOptions(questionData.options.map(option => option.text));
          setOptionPoints(
            questionData.options.map(option => Math.abs(option.points || 0))
          );
          setIsOptionWrong(
            questionData.options.map(option => (option.points || 0) < 0)
          );
        } else {
          setOptions([]);
          setOptionPoints([]);
          setIsOptionWrong([]);
        }
        setIsScored((questionData as any).isScored || false);
        setSubtractPointsForWrongAnswers(
          (questionData as MultipleResponseQuestion).allowNegative || false
        );
        break;
      case 'Scale':
        if (
          'scaleMax' in questionData &&
          'labels' in questionData &&
          questionData.labels.length >= 2
        ) {
          setScaleMax(questionData.scaleMax);
          setPreviousScaleMax(questionData.scaleMax);
          // Sort labels by value
          const sortedLabels = [...questionData.labels].sort(
            (a, b) => a.value - b.value
          );
          const min = sortedLabels.find(label => label.value === 1) || {
            value: 1,
            label: 'Low',
            points: 0,
          };
          const max = sortedLabels.find(
            label => label.value === questionData.scaleMax
          ) || {
            value: questionData.scaleMax,
            label: 'High',
            points: 0,
          };
          const intermediates = sortedLabels.filter(
            label => label.value !== min.value && label.value !== max.value
          );
          setMinLabel(min);
          setMaxLabel(max);
          setIntermediateLabels(intermediates);
          setTempScaleMax(questionData.scaleMax.toString());
        } else {
          setScaleMax(5);
          setPreviousScaleMax(5);
          setMinLabel({ value: 1, label: 'Low', points: 0 });
          setMaxLabel({ value: 5, label: 'High', points: 0 });
          setIntermediateLabels([]);
          setTempScaleMax('5');
        }
        setIsScored((questionData as any).isScored || false);
        break;
      case 'Short Response':
        setShortResponsePlaceholder(
          (questionData as ShortResponseQuestion).shortResponsePlaceholder || ''
        );
        setShortResponseValue(''); // Future submission handling
        break;
      case 'Long Response':
        setShortResponsePlaceholder(
          (questionData as LongResponseQuestion).longResponsePlaceholder || ''
        );
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
        setIsScored((questionData as any).isScored || false);
        setScoringMethod(
          (questionData as NumberQuestion).scoringMethod || 'None'
        );
        setMaxPoints((questionData as NumberQuestion).maxPoints || 0);
        setScoringRanges((questionData as NumberQuestion).scoringRanges || []);
        break;
      default:
        break;
    }
  }, [questionType, questionData]);

  // Synchronize tempScaleMax with scaleMax when scaleMax changes externally
  useEffect(() => {
    setTempScaleMax(scaleMax.toString());
    setPreviousScaleMax(scaleMax);
  }, [scaleMax]);

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleOptionWrongChange = (index: number, value: boolean) => {
    const newIsOptionWrong = [...isOptionWrong];
    newIsOptionWrong[index] = value;
    setIsOptionWrong(newIsOptionWrong);
  };

  const handleDeleteOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };

  const toggleOption = (index: number) => {
    if (questionType === 'Multiple Choice') {
      setSelectedOptions(selectedOptions.includes(index) ? [] : [index]);
    } else if (questionType === 'Multiple Response') {
      setSelectedOptions(prev =>
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
      );
    }
  };

  // Points handler
  const handleOptionPointsChange = (index: number, value: number) => {
    const newOptionPoints = [...optionPoints];
    newOptionPoints[index] = Math.abs(value) || 0;
    setOptionPoints(newOptionPoints);
  };

  // Handlers for dynamic intermediate labels
  const handleAddIntermediateLabel = () => {
    // Determine next available value between min and max
    const existingValues = intermediateLabels.map(l => l.value);
    let newValue = Math.floor((minLabel.value + maxLabel.value) / 2);
    while (
      existingValues.includes(newValue) &&
      newValue > minLabel.value &&
      newValue < maxLabel.value
    ) {
      newValue += 1;
    }
    if (newValue > minLabel.value && newValue < maxLabel.value) {
      setIntermediateLabels([
        ...intermediateLabels,
        { value: newValue, label: '', points: 0 },
      ]);
    } else {
      alert('Cannot add more intermediate labels.');
    }
  };

  const handleIntermediateLabelChange = (
    index: number,
    field: keyof ScaleLabel,
    value: string | number
  ) => {
    const updatedLabels = [...intermediateLabels];
    updatedLabels[index] = { ...updatedLabels[index], [field]: value };
    setIntermediateLabels(updatedLabels);
  };

  const handleDeleteIntermediateLabel = (index: number) => {
    const updatedLabels = intermediateLabels.filter((_, i) => i !== index);
    setIntermediateLabels(updatedLabels);
  };
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
    const updatedRanges = scoringRanges.filter((_, i) => i !== index);
    setScoringRanges(updatedRanges);
  };

  const saveQuestion = () => {
    // Validate Scale labels
    if (questionType === 'Scale') {
      if (!minLabel || !maxLabel) {
        alert('Scale questions must have both min and max labels.');
        return;
      }

      // Ensure no duplicate intermediate label values
      const allValues = intermediateLabels.map(label => label.value);
      const uniqueValues = new Set(allValues);
      if (uniqueValues.size !== allValues.length) {
        alert('Intermediate label values must be unique.');
        return;
      }

      // Ensure all intermediate labels are between min and max
      const invalidLabels = intermediateLabels.filter(
        label => label.value <= minLabel.value || label.value >= maxLabel.value
      );
      if (invalidLabels.length > 0) {
        alert(
          'Intermediate label values must be between min and max scale values.'
        );
        return;
      }
    }

    let updatedQuestion: QuestionUnion;

    switch (questionType) {
      case 'Multiple Choice':
        updatedQuestion = {
          ...questionData,
          text: questionText,
          type: questionType,
          options: options.map((optionText, index) => ({
            text: optionText,
            points: isScored ? optionPoints[index] : 0,
          })),
          isScored,
          customInstruction: customInstruction || getDefaultInstruction(),
          isLocked: questionData.isLocked || false,
          isRequired,
        } as MultipleChoiceQuestion;
        break;
      case 'Multiple Response':
        updatedQuestion = {
          ...questionData,
          text: questionText,
          type: questionType,
          options: options.map((optionText, index) => ({
            text: optionText,
            points: isScored
              ? subtractPointsForWrongAnswers && isOptionWrong[index]
                ? -Math.abs(optionPoints[index] || 0)
                : Math.abs(optionPoints[index] || 0)
              : 0,
          })),
          isScored,
          allowNegative: subtractPointsForWrongAnswers,
          customInstruction: customInstruction || getDefaultInstruction(),
          isLocked: questionData.isLocked || false,
          isRequired,
        } as MultipleResponseQuestion;
        break;
      case 'Scale':
        if (isScored) {
          // Combine labels
          const allLabels = [minLabel, ...intermediateLabels, maxLabel];
          // Sort labels by value
          const sortedLabels = allLabels.sort((a, b) => a.value - b.value);

          // Check for duplicate values
          const valuesSet = new Set(sortedLabels.map(label => label.value));
          if (valuesSet.size !== sortedLabels.length) {
            alert('Label values must be unique.');
            return;
          }

          // Check for increasing points
          for (let i = 0; i < sortedLabels.length - 1; i++) {
            if (sortedLabels[i].points > sortedLabels[i + 1].points) {
              alert('Points should increase with higher scale values.');
              return;
            }
          }
        }

        updatedQuestion = {
          ...questionData,
          text: questionText,
          type: questionType,
          scaleMax,
          labels: [
            minLabel,
            ...intermediateLabels.sort((a, b) => a.value - b.value),
            maxLabel,
          ],
          isScored,
          customInstruction: customInstruction || getDefaultInstruction(),
          isLocked: questionData.isLocked || false,
          isRequired,
        } as ScaleQuestion;
        break;
      case 'Short Response':
        updatedQuestion = {
          ...questionData,
          text: questionText,
          type: questionType,
          shortResponsePlaceholder:
            shortResponsePlaceholder || 'Enter your response here...',
          customInstruction: customInstruction || getDefaultInstruction(),
          isLocked: questionData.isLocked || false,
          isRequired, // Added isRequired
        } as ShortResponseQuestion;
        break;
      case 'Long Response':
        updatedQuestion = {
          ...questionData,
          text: questionText,
          type: questionType,
          longResponsePlaceholder:
            shortResponsePlaceholder || 'Enter your response here...',
          customInstruction: customInstruction || getDefaultInstruction(),
          isLocked: questionData.isLocked || false,
          isRequired,
        } as LongResponseQuestion;
        break;
      case 'Date':
        updatedQuestion = {
          ...questionData,
          text: questionText,
          type: questionType,
          isRange: isRange || false,
          datePickerPlaceholder,
          minDate: minDate || undefined,
          maxDate: maxDate || undefined,
          customInstruction: customInstruction || getDefaultInstruction(),
          isLocked: questionData.isLocked || false,
          isRequired, // Added isRequired
        } as DateQuestion;
        break;
      case 'Number':
        if (isScored) {
          if (scoringMethod === 'range') {
            // Validate scoring ranges
            const ranges = scoringRanges.sort(
              (a, b) => a.minValue - b.minValue
            );
            // Check for overlaps and increasing points
            let isValid = true;
            for (let i = 0; i < ranges.length; i++) {
              const currentRange = ranges[i];
              const nextRange = ranges[i + 1];
              // Check for overlap
              if (nextRange && currentRange.maxValue >= nextRange.minValue) {
                alert(
                  `Ranges overlap between ${currentRange.minValue}-${currentRange.maxValue} and ${nextRange.minValue}-${nextRange.maxValue}. Please adjust the ranges.`
                );
                isValid = false;
                break;
              }
              // Check for increasing points
              if (nextRange && currentRange.points > nextRange.points) {
                alert(
                  `Points should increase with higher ranges. Range ${currentRange.minValue}-${currentRange.maxValue} has ${currentRange.points} points, which is higher than the next range.`
                );
                isValid = false;
                break;
              }
            }
            if (!isValid) {
              return;
            }
          }
        }

        updatedQuestion = {
          ...questionData,
          text: questionText,
          type: questionType,
          maxNumber: numberValue || 100,
          isScored,
          scoringMethod: isScored ? scoringMethod : 'None',
          maxPoints:
            scoringMethod === 'direct' && isScored ? maxPoints : undefined,
          scoringRanges:
            scoringMethod === 'range' && isScored ? scoringRanges : undefined,
          customInstruction: customInstruction || getDefaultInstruction(),
          isLocked: questionData.isLocked || false,
          isRequired,
        } as NumberQuestion;
        break;
      case 'Undecided':
        updatedQuestion = {
          ...questionData,
          text: questionText,
          type: questionType,
          customInstruction: customInstruction || '',
          isLocked: questionData.isLocked || false,
          isRequired,
        } as UndecidedQuestion;
        break;
      case 'NUSNET ID':
        updatedQuestion = {
          ...questionData,
          text: questionText || 'Student NUSNET ID (EXXXXXXX)',
          type: 'NUSNET ID',
          shortResponsePlaceholder: shortResponsePlaceholder || 'E1234567',
          customInstruction: customInstruction || getDefaultInstruction(),
          isLocked: true,
          isRequired: true,
        } as NUSNETIDQuestion;
        break;
      case 'NUSNET Email':
        updatedQuestion = {
          ...questionData,
          text: questionText || 'Student NUSNET Email',
          type: 'NUSNET Email',
          shortResponsePlaceholder:
            shortResponsePlaceholder || 'e1234567@u.nus.edu',
          customInstruction: customInstruction || getDefaultInstruction(),
          isLocked: true,
          isRequired: true,
        } as NUSNETEmailQuestion;
        break;
      case 'Team Member Selection':
        updatedQuestion = {
          ...questionData,
          text: questionText || 'Select team members to evaluate',
          type: 'Team Member Selection',
          customInstruction: customInstruction || getDefaultInstruction(),
          isLocked: true,
          isRequired: true,
        } as TeamMemberSelectionQuestion;
        break;
      default:
        updatedQuestion = {
          ...questionData,
          text: questionText,
          type: questionType,
          isLocked: questionData.isLocked || false,
          isRequired,
        } as QuestionUnion;
        break;
    }

    onSave(updatedQuestion);
    setIsEditing(false);
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
      case 'NUSNET ID':
        return 'Enter your NUSNET ID starting with E followed by 7 digits.';
      case 'NUSNET Email':
        return 'Enter your NUSNET email address.';
      case 'Team Member Selection':
        return 'Select team members from your team to evaluate.';
      default:
        return '';
    }
  };

  if (!isEditing) {
    // View mode (Form Takers)
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
          <Badge color={isQuestionLocked ? 'red' : 'blue'} size="sm">
            {isQuestionLocked ? 'Locked' : questionType}
          </Badge>
        </Group>

        {/* Question instruction */}
        <Text color="gray" size="sm" mb="xs">
          {customInstruction || getDefaultInstruction()}
        </Text>

        {/* Question text with numbering */}
        <Text mb="sm">
          {index + 1}. {questionText}
        </Text>

        {/* Render based on question type */}
        {questionType === 'Multiple Choice' ||
        questionType === 'Multiple Response' ? (
          <Group
            align="stretch"
            style={{ flexGrow: 1, flexDirection: 'column' }}
          >
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
              min={minLabel.value}
              max={scaleMax}
              marks={[
                { value: minLabel.value, label: minLabel.label },
                ...intermediateLabels.map(label => ({
                  value: label.value,
                  label: label.label,
                })),
                { value: maxLabel.value, label: maxLabel.label },
              ]}
              step={1}
              style={{ padding: '0 20px', marginBottom: '20px' }}
              onChange={setScaleValue}
            />
            <Box style={{ marginTop: '24px' }} />
          </>
        ) : null}

        {(questionType === 'Short Response' ||
          questionType === 'NUSNET ID' ||
          questionType === 'NUSNET Email') && (
          <TextInput
            placeholder={
              shortResponsePlaceholder || 'Enter your response here...'
            }
            value={shortResponseValue}
            onChange={e => setShortResponseValue(e.currentTarget.value)}
            style={{ marginBottom: '16px' }}
          />
        )}

        {questionType === 'Long Response' && (
          <Textarea
            placeholder={
              shortResponsePlaceholder || 'Enter your response here...'
            }
            value={longResponseValue}
            onChange={e => setLongResponseValue(e.currentTarget.value)}
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
            onChange={e => setNumberValue(parseInt(e.currentTarget.value, 10))}
            style={{ marginBottom: '16px' }}
          />
        ) : null}

        {/* Edit and Delete buttons */}
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
      <Text size="sm" mb="xs">
        Question {index + 1}
      </Text>
      <Group style={{ marginBottom: '16px' }}>
        <TextInput
          label="Question"
          placeholder="Enter the question"
          value={questionText}
          onChange={e => {
            setQuestionText(e.currentTarget.value);
          }}
          required
          style={{ flex: 2, marginRight: '8px' }}
        />

        <Select
          label="Question Type"
          value={questionType}
          onChange={value => {
            setQuestionType(value as QuestionUnion['type']);
          }}
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
            ...(enableNewQuestionTypesForTesting
              ? [
                  {
                    group: 'Special Questions (Testing)',
                    items: [
                      { value: 'NUSNET ID', label: 'NUSNET ID' },
                      { value: 'NUSNET Email', label: 'NUSNET Email' },
                      {
                        value: 'Team Member Selection',
                        label: 'Team Member Selection',
                      },
                    ],
                  },
                ]
              : []),
          ]}
          required
          style={{ flex: 1 }}
        />
      </Group>

      <TextInput
        label="Instructions"
        placeholder={getDefaultInstruction()}
        value={customInstruction}
        onChange={e => {
          setCustomInstruction(e.currentTarget.value);
        }}
        style={{ marginBottom: '16px' }}
      />

      {/* Checkbox to toggle isRequired */}
      <Checkbox
        label="Required"
        checked={isRequired}
        onChange={e => setIsRequired(e.currentTarget.checked)}
        style={{ marginBottom: '16px' }}
      />

      {(questionType === 'Multiple Choice' ||
        questionType === 'Multiple Response') && (
        <Box style={{ marginBottom: '16px' }}>
          <Checkbox
            label="Enable Scoring"
            checked={isScored}
            onChange={e => setIsScored(e.currentTarget.checked)}
            style={{ marginBottom: '8px' }}
          />
          {questionType === 'Multiple Response' && isScored && (
            <Checkbox
              label="Subtract points for wrong answers"
              checked={subtractPointsForWrongAnswers}
              onChange={e =>
                setSubtractPointsForWrongAnswers(e.currentTarget.checked)
              }
              style={{ marginBottom: '8px' }}
            />
          )}
          <Text>Options:</Text>
          {options.map((option, index) => (
            <Group key={index} style={{ marginTop: '8px', gap: '8px' }}>
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
              {isScored && subtractPointsForWrongAnswers && (
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
          <Button
            variant="light"
            color="blue"
            leftSection={<IconPlus size={16} />}
            onClick={handleAddOption}
            style={{ marginTop: '8px' }}
          >
            Add Option
          </Button>
        </Box>
      )}

      {questionType === 'Scale' && (
        <>
          <Box style={{ marginBottom: '16px' }}>
            <Checkbox
              label="Enable Scoring"
              checked={isScored}
              onChange={e => setIsScored(e.currentTarget.checked)}
              style={{ marginBottom: '8px' }}
            />
            <Text style={{ fontWeight: 'bold', marginBottom: '8px' }}>
              Scale Labels:
            </Text>

            {/* Min Label */}
            <Group style={{ marginTop: '8px', gap: '8px' }}>
              <TextInput
                label="Min Value"
                type="number"
                value={minLabel.value}
                disabled // Fixed at 1
                style={{ flex: 1 }}
              />
              <TextInput
                label="Min Label"
                placeholder="Enter min label"
                value={minLabel.label}
                onChange={e =>
                  setMinLabel({ ...minLabel, label: e.currentTarget.value })
                }
                style={{ flex: 2 }}
              />
              {isScored && (
                <TextInput
                  placeholder="Points"
                  type="number"
                  min={0}
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
            </Group>

            {/* Intermediate Labels */}
            {intermediateLabels.map((label, index) => (
              <Group key={index} style={{ marginTop: '8px', gap: '8px' }}>
                <TextInput
                  label={`Intermediate Value ${index + 1}`}
                  type="number"
                  value={label.value}
                  onChange={e =>
                    handleIntermediateLabelChange(
                      index,
                      'value',
                      parseInt(e.currentTarget.value, 10)
                    )
                  }
                  style={{ flex: 1 }}
                />
                <TextInput
                  label="Label"
                  placeholder="Enter label"
                  value={label.label}
                  onChange={e =>
                    handleIntermediateLabelChange(
                      index,
                      'label',
                      e.currentTarget.value
                    )
                  }
                  style={{ flex: 2 }}
                />
                {isScored && (
                  <TextInput
                    label="Points"
                    type="number"
                    value={label.points}
                    onChange={e =>
                      handleIntermediateLabelChange(
                        index,
                        'points',
                        parseFloat(e.currentTarget.value)
                      )
                    }
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
              style={{ marginTop: '8px' }}
            >
              Add Intermediate Label
            </Button>

            {/* Max Scale Value */}
            <Group style={{ marginTop: '16px', gap: '8px' }}>
              <TextInput
                label="Max Scale Value"
                type="number"
                value={tempScaleMax}
                onChange={e => {
                  const value = e.currentTarget.value;
                  // Remove leading zeros
                  const trimmedValue = value.replace(/^0+/, '') || '';
                  setTempScaleMax(trimmedValue);
                }}
                onBlur={() => {
                  if (
                    tempScaleMax !== '' &&
                    !isNaN(Number(tempScaleMax)) &&
                    Number(tempScaleMax) > 1
                  ) {
                    const newScaleMax = Number(tempScaleMax);
                    setPreviousScaleMax(scaleMax); // Store current scaleMax before updating
                    setScaleMax(newScaleMax);
                    setMaxLabel({
                      value: newScaleMax,
                      label: maxLabel.label,
                      points: maxLabel.points,
                    });
                    // Remove intermediate labels that exceed newScaleMax
                    const filteredIntermediates = intermediateLabels.filter(
                      label => label.value < newScaleMax
                    );
                    setIntermediateLabels(filteredIntermediates);
                  } else {
                    alert('Max scale value must be a number greater than 1.');
                    setTempScaleMax(previousScaleMax.toString()); // Reset to previous valid scaleMax
                  }
                }}
                placeholder="Enter maximum scale value"
                required
                style={{ flex: 1 }}
              />
              <TextInput
                label="Max Label"
                placeholder="Enter max label"
                value={maxLabel.label}
                onChange={e =>
                  setMaxLabel({ ...maxLabel, label: e.currentTarget.value })
                }
                style={{ flex: 2 }}
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
          </Box>

          {/* Preview Section */}
          <Box style={{ marginTop: '24px' }}>
            <Text style={{ fontWeight: 'bold', marginBottom: '8px' }}>
              Preview:
            </Text>
            <Slider
              value={scaleValue}
              min={minLabel.value}
              max={scaleMax}
              marks={[
                { value: minLabel.value, label: minLabel.label },
                ...intermediateLabels.map(label => ({
                  value: label.value,
                  label: label.label,
                })),
                { value: maxLabel.value, label: maxLabel.label },
              ]}
              step={1}
              style={{ padding: '0 20px', marginBottom: '20px' }}
              onChange={setScaleValue}
              disabled // Disabled in edit mode to prevent interaction
            />
          </Box>
        </>
      )}

      {(questionType === 'Short Response' ||
        questionType === 'NUSNET ID' ||
        questionType === 'NUSNET Email') && (
        <Box style={{ marginBottom: '16px' }}>
          <TextInput
            label="Predefined Placeholder"
            placeholder="Customize the placeholder"
            value={shortResponsePlaceholder}
            onChange={e => {
              setShortResponsePlaceholder(e.currentTarget.value);
            }}
            style={{ marginBottom: '16px' }}
          />
          <Text style={{ marginTop: '8px', marginBottom: '4px' }}>
            Preview:
          </Text>
          <TextInput placeholder={shortResponsePlaceholder} disabled />
        </Box>
      )}

      {questionType === 'Long Response' && (
        <Box style={{ marginBottom: '16px' }}>
          <TextInput
            label="Predefined Placeholder"
            placeholder="Customize the placeholder"
            value={shortResponsePlaceholder}
            onChange={e => {
              setShortResponsePlaceholder(e.currentTarget.value);
            }}
            style={{ marginBottom: '16px' }}
          />
          <Text style={{ marginTop: '8px', marginBottom: '4px' }}>
            Preview:
          </Text>
          <Textarea
            placeholder={
              shortResponsePlaceholder || 'Enter your response here...'
            }
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
              onChange={e => setIsRange(e.currentTarget.checked)}
            />
          </Group>

          <TextInput
            label="Date Picker Placeholder"
            placeholder="Customize the placeholder"
            value={datePickerPlaceholder}
            onChange={e => setDatePickerPlaceholder(e.currentTarget.value)}
            style={{ marginBottom: '16px' }}
          />

          <Group grow style={{ marginTop: '16px', gap: '16px' }}>
            <Box>
              <Text>{'Earliest Valid Date'}</Text>
              <DatePicker value={minDate} onChange={date => setMinDate(date)} />
            </Box>
            <Box>
              <Text>{'Latest Valid Date'}</Text>
              <DatePicker
                placeholder="Select max date"
                value={maxDate}
                onChange={date => setMaxDate(date)}
              />
            </Box>
          </Group>
        </Box>
      )}

      {questionType === 'Number' && (
        <Box style={{ marginBottom: '16px' }}>
          <TextInput
            label="Max Number"
            type="number"
            value={numberValue}
            onChange={e => {
              setNumberValue(parseInt(e.currentTarget.value, 10));
            }}
            placeholder="Enter maximum allowed number"
            style={{ marginBottom: '16px' }}
          />

          <Checkbox
            label="Enable Scoring"
            checked={isScored}
            onChange={e => setIsScored(e.currentTarget.checked)}
            style={{ marginBottom: '16px' }}
          />

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
                style={{ marginBottom: '16px' }}
              />

              {scoringMethod === 'direct' && (
                <TextInput
                  label="Max Points"
                  type="number"
                  value={maxPoints}
                  onChange={e =>
                    setMaxPoints(parseFloat(e.currentTarget.value))
                  }
                  placeholder="Enter maximum points"
                  style={{ marginBottom: '16px' }}
                />
              )}

              {scoringMethod === 'range' && (
                <Box>
                  <Text style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                    Scoring Ranges:
                  </Text>
                  <Text size="sm" c="gray">
                    * Ranges are inclusive of both bounds.
                  </Text>
                  {scoringRanges.map((range, index) => (
                    <Group key={index} style={{ marginTop: '8px', gap: '8px' }}>
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
                    style={{ marginTop: '8px' }}
                  >
                    Add Scoring Range
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>
      )}

      {questionType === 'Team Member Selection' && (
        <Box style={{ marginBottom: '16px' }}>
          <Text>
            {
              'This question allows the form taker to select team members to evaluate.'
            }
          </Text>
        </Box>
      )}

      {/* Delete and Save buttons */}
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

export default AssessmentMakeQuestionCard;
