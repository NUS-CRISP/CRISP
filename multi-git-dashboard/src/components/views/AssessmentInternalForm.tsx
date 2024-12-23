/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Button,
  Modal,
  Group,
  Text,
  Box,
  Alert,
} from '@mantine/core';
import {
  MultipleChoiceQuestion,
  MultipleResponseQuestion,
  NumberQuestion,
  ScaleQuestion,
  Question,
} from '@shared/types/Question';
import AssessmentMakeQuestionCard from '@/components/cards/AssessmentMakeQuestionCard';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import { useEffect, useState } from 'react';
import CSVUpload from '../csv/CSVUpload';

/** 1) Define the columns we expect in a CSV, same as your transform function. */
const questionHeaders = [
  'type',
  'text',
  'isRequired',
  'isLocked',
  'customInstruction',
  'isScored',
  'options', // "Option1|2;Option2|5"
  'allowNegative',
  'areWrongAnswersPenalized',
  'allowPartialMarks',
  'scaleMax',
  'labels', // "1|Min|0;5|Max|10"
  'maxNumber',
  'scoringMethod',
  'maxPoints',
  'scoringRanges', // "0|10|3;11|20|5"
  'shortResponsePlaceholder',
  'longResponsePlaceholder',
  'isRange',
  'datePickerPlaceholder',
  'minDate',
  'maxDate',
];

/** 2) Basic instructions that will appear at the top of the CSV Template. */
const csvInstructions = [
  '# INSTRUCTIONS:',
  '# Valid question types: Multiple Choice, Multiple Response, Scale,',
  '#   Short Response, Long Response, Date, Number, Undecided.',
  '# Rows with question.type = NUSNET ID, NUSNET Email, Team Member Selection',
  '#   are excluded automatically upon upload.',
].join('\n');

/** 3) Transform function to parse CSV => question objects. */
function transformQuestions(data: any[]): any[] {
  // Filter out NUSNET/TeamMember
  const filteredRows = data.filter((row) => {
    return (
      row.type !== 'NUSNET ID' &&
      row.type !== 'NUSNET Email' &&
      row.type !== 'Team Member Selection'
    );
  });

  return filteredRows.map((row, idx) => {
    if (!row.type || !row.text) {
      throw new Error(`Row ${idx + 1} is missing required 'type' or 'text' field`);
    }

    const validTypes = [
      'Multiple Choice',
      'Multiple Response',
      'Scale',
      'Short Response',
      'Long Response',
      'Date',
      'Number',
      'Undecided',
    ];
    if (!validTypes.includes(row.type)) {
      throw new Error(`Row ${idx + 1} has unrecognized question type: ${row.type}`);
    }

    // For Multiple Choice / Response
    let parsedOptions;
    if (
      row.options &&
      (row.type === 'Multiple Choice' || row.type === 'Multiple Response')
    ) {
      parsedOptions = row.options.split(';').map((optStr: string) => {
        const [text, points] = optStr.split('|');
        if (!text || points === undefined) {
          throw new Error(`Invalid options format at Row ${idx + 1}`);
        }
        return { text: text.trim(), points: Number(points.trim()) };
      });
    }

    // For Scale
    let parsedLabels;
    if (row.labels && row.type === 'Scale') {
      parsedLabels = row.labels.split(';').map((labStr: string) => {
        const [value, label, pts] = labStr.split('|');
        if (!value || !label || pts === undefined) {
          throw new Error(`Invalid labels format at Row ${idx + 1}`);
        }
        return {
          value: Number(value.trim()),
          label: label.trim(),
          points: Number(pts.trim()),
        };
      });
    }

    // For Number
    let parsedScoringRanges;
    if (row.scoringRanges && row.type === 'Number') {
      parsedScoringRanges = row.scoringRanges.split(';').map((rangeStr: string) => {
        const [minValue, maxValue, points] = rangeStr.split('|');
        if (minValue === undefined || maxValue === undefined || points === undefined) {
          throw new Error(`Invalid scoringRanges format at Row ${idx + 1}`);
        }
        return {
          minValue: Number(minValue.trim()),
          maxValue: Number(maxValue.trim()),
          points: Number(points.trim()),
        };
      });
    }

    return {
      type: row.type.trim(),
      text: row.text.trim(),
      isRequired: row.isRequired === 'true',
      isLocked: row.isLocked === 'true',
      customInstruction: row.customInstruction || '',
      isScored: row.isScored === 'true',
      allowNegative: row.allowNegative === 'true',
      areWrongAnswersPenalized: row.areWrongAnswersPenalized === 'true',
      allowPartialMarks: row.allowPartialMarks === 'true',
      scaleMax: row.scaleMax ? Number(row.scaleMax) : undefined,
      labels: parsedLabels,
      maxNumber: row.maxNumber ? Number(row.maxNumber) : undefined,
      scoringMethod: row.scoringMethod || '',
      maxPoints: row.maxPoints ? Number(row.maxPoints) : undefined,
      scoringRanges: parsedScoringRanges,
      shortResponsePlaceholder: row.shortResponsePlaceholder || '',
      longResponsePlaceholder: row.longResponsePlaceholder || '',
      isRange: row.isRange === 'true',
      datePickerPlaceholder: row.datePickerPlaceholder || '',
      minDate: row.minDate || '',
      maxDate: row.maxDate || '',
      options: parsedOptions,
    };
  });
}

/** 4) Helper to create the CSV template + instructions. */
function downloadCsvTemplateWithInstructions() {
  const csvContent =
    csvInstructions +
    '\n\n' +
    questionHeaders.join(',') +
    '\n';

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const filename = 'questions_template_with_instructions.csv';

  // Download
  const navigator: any = window.navigator;
  if (navigator.msSaveOrOpenBlob) {
    navigator.msSaveOrOpenBlob(blob, filename);
  } else {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/** 5) Convert existing (already fetched) questions => CSV string. */
function downloadExistingQuestionsCsv(questions: Question[]) {
  // Filter out NUSNET ID, NUSNET Email, Team Member Selection
  const filtered = questions.filter((q) => {
    return (
      q.type !== 'NUSNET ID' &&
      q.type !== 'NUSNET Email' &&
      q.type !== 'Team Member Selection'
    );
  });

  // Build the CSV rows
  const rows: string[] = [];
  // 1) header row
  rows.push(questionHeaders.join(','));

  // 2) each question => row
  filtered.forEach((q) => {
    // We'll map each header to a string.
    // For arrays like "options", "labels", we reverse the logic in transformQuestions.
    const rowValues = questionHeaders.map((header) => {
      switch (header) {
        case 'type':
          return q.type || '';
        case 'text':
          return q.text || '';
        case 'isRequired':
          return q.isRequired ? 'true' : 'false';
        case 'isLocked':
          return q.isLocked ? 'true' : 'false';
        case 'customInstruction':
          return q.customInstruction || '';
        case 'isScored':
          return (q as any).isScored ? 'true' : 'false';
        case 'options': {
          if (
            (q.type === 'Multiple Choice' || q.type === 'Multiple Response') &&
            (q as any).options
          ) {
            // "Option A|2;Option B|4"
            return (q as any).options
              .map((opt: any) => `${opt.text}|${opt.points}`)
              .join(';');
          }
          return '';
        }
        case 'allowNegative':
          return (q as any).allowNegative ? 'true' : 'false';
        case 'areWrongAnswersPenalized':
          return (q as any).areWrongAnswersPenalized ? 'true' : 'false';
        case 'allowPartialMarks':
          return (q as any).allowPartialMarks ? 'true' : 'false';
        case 'scaleMax':
          return (q as any).scaleMax?.toString() || '';
        case 'labels': {
          if (q.type === 'Scale' && (q as any).labels) {
            // "1|Min|0;5|Max|10"
            return (q as any).labels
              .map((lab: any) => `${lab.value}|${lab.label}|${lab.points}`)
              .join(';');
          }
          return '';
        }
        case 'maxNumber':
          return (q as any).maxNumber?.toString() || '';
        case 'scoringMethod':
          return (q as any).scoringMethod || '';
        case 'maxPoints':
          return (q as any).maxPoints?.toString() || '';
        case 'scoringRanges': {
          if (q.type === 'Number' && (q as any).scoringRanges) {
            // "0|10|3;11|20|5"
            return (q as any).scoringRanges
              .map((r: any) => `${r.minValue}|${r.maxValue}|${r.points}`)
              .join(';');
          }
          return '';
        }
        case 'shortResponsePlaceholder':
          return (q as any).shortResponsePlaceholder || '';
        case 'longResponsePlaceholder':
          return (q as any).longResponsePlaceholder || '';
        case 'isRange':
          return (q as any).isRange ? 'true' : 'false';
        case 'datePickerPlaceholder':
          return (q as any).datePickerPlaceholder || '';
        case 'minDate':
          return (q as any).minDate || '';
        case 'maxDate':
          return (q as any).maxDate || '';
        default:
          return '';
      }
    });

    // Join columns with commas
    // IMPORTANT: for production use, consider escaping fields with quotes if they have commas
    rows.push(rowValues.map((val) => val.replace(/\r?\n|\r/g, ' ')).join(','));
  });

  // Combine into a single CSV string
  const csvString = rows.join('\n');

  // Download
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8' });
  const filename = 'existing_questions.csv';
  const navigator: any = window.navigator;
  if (navigator.msSaveOrOpenBlob) {
    navigator.msSaveOrOpenBlob(blob, filename);
  } else {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

interface AssessmentInternalFormProps {
  assessment: InternalAssessment | null;
  questions: Question[];
  addQuestion: () => void;
  handleSaveQuestion: (id: string, updatedQuestion: Question) => void;
  handleDeleteQuestion: (id: string) => void;
  onAssessmentUpdated: () => void;
}

const AssessmentInternalForm: React.FC<AssessmentInternalFormProps> = ({
  assessment,
  questions,
  addQuestion,
  handleSaveQuestion,
  handleDeleteQuestion,
  onAssessmentUpdated,
}) => {
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [isRecallModalOpen, setIsRecallModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false); // CSV Upload modal

  const [csvErrorMessage, setCsvErrorMessage] = useState('');

  const isLocked = assessment?.isReleased || false;
  const isReleased = assessment?.isReleased || false;

  // If CSV parse/upload fails
  const handleCsvError = (message: string) => {
    setCsvErrorMessage(message);
  };

  // If CSV is processed & uploaded successfully => refresh
  const handleCsvProcessComplete = () => {
    onAssessmentUpdated();
  };

  /** Release Form logic */
  const releaseForm = async () => {
    try {
      const response = await fetch(
        `/api/internal-assessments/${assessment?._id}/release`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      if (!response.ok) {
        console.error('Error releasing form:', response.statusText);
        return;
      }
      setIsReleaseModalOpen(false);
      onAssessmentUpdated();
    } catch (error) {
      console.error('Error releasing form:', error);
    }
  };

  /** Recall Form logic */
  const recallForm = async () => {
    try {
      const response = await fetch(
        `/api/internal-assessments/${assessment?._id}/recall`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      if (!response.ok) {
        console.error('Error recalling form:', response.statusText);
        return;
      }
      setIsRecallModalOpen(false);
      onAssessmentUpdated();
    } catch (error) {
      console.error('Error recalling form:', error);
    }
  };

  const calculateTotalPossiblePoints = (): number => {
    let totalPoints = 0;
    questions.forEach((question) => {
      switch (question.type) {
        case 'Multiple Choice': {
          const mc = question as MultipleChoiceQuestion;
          if (mc.isScored) {
            const maxOptionPoints = Math.max(...mc.options.map((o) => o.points || 0));
            totalPoints += maxOptionPoints;
          }
          break;
        }
        case 'Multiple Response': {
          const mr = question as MultipleResponseQuestion;
          if (mr.isScored) {
            const positivePoints = mr.options
              .map((o) => o.points || 0)
              .filter((p) => p > 0);
            totalPoints += positivePoints.reduce((sum, p) => sum + p, 0);
          }
          break;
        }
        case 'Scale': {
          const sc = question as ScaleQuestion;
          if (sc.isScored) {
            const maxLabelPoints = Math.max(...sc.labels.map((l) => l.points || 0));
            totalPoints += maxLabelPoints;
          }
          break;
        }
        case 'Number': {
          const num = question as NumberQuestion;
          if (num.isScored) {
            if (num.scoringMethod === 'direct') {
              totalPoints += num.maxPoints || 0;
            } else if (num.scoringMethod === 'range') {
              const maxRangePoints = Math.max(
                ...(num.scoringRanges || []).map((r) => r.points || 0)
              );
              totalPoints += maxRangePoints;
            }
          }
          break;
        }
        default:
          break;
      }
    });
    return totalPoints;
  };

  const [totalPossiblePoints, setTotalPossiblePoints] = useState(
    calculateTotalPossiblePoints()
  );
  const maxMarks = assessment?.maxMarks || 0;
  const [scalingFactor, setScalingFactor] = useState(
    maxMarks && totalPossiblePoints > 0
      ? maxMarks / totalPossiblePoints
      : 1
  );

  useEffect(() => {
    setTotalPossiblePoints(calculateTotalPossiblePoints());
  }, [questions]);

  useEffect(() => {
    const total = calculateTotalPossiblePoints();
    setTotalPossiblePoints(total);

    const maxMarksLocal = assessment?.maxMarks || 0;
    const scaling = maxMarksLocal && total > 0 ? maxMarksLocal / total : 1;
    setScalingFactor(scaling);
  }, [questions, assessment?.maxMarks]);

  return (
    <div>
      {!isLocked && (
        <Box mt="md">
          <Group>
            <Button
              color="blue"
              onClick={() => {
                setCsvErrorMessage('');
                setIsCsvModalOpen(true);
              }}
            >
              Upload via CSV
            </Button>

            <Button variant="outline" onClick={downloadCsvTemplateWithInstructions}>
              Download CSV Template
            </Button>

            <Button
              variant="outline"
              onClick={() => downloadExistingQuestionsCsv(questions)}
            >
              Download Existing Questions
            </Button>
          </Group>
        </Box>
      )}

      <Box pt={16}>
        {questions.map((question, index) => (
          <AssessmentMakeQuestionCard
            key={question._id}
            index={index}
            questionData={question}
            onSave={(updatedQuestion) =>
              handleSaveQuestion(question._id, updatedQuestion)
            }
            onDelete={() => handleDeleteQuestion(question._id)}
            isLocked={isLocked || question.isLocked}
          />
        ))}
      </Box>

      <Box mt={24} pb={16}>
        <Text>Total Possible Points from Questions: {totalPossiblePoints}</Text>
        <Text>Assessment Maximum Marks: {maxMarks}</Text>
        {maxMarks && totalPossiblePoints > 0 && (
          <Text>
            Points in this quiz will be adjusted by this factor to match max marks: x
            {scalingFactor.toFixed(2)}
          </Text>
        )}
      </Box>

      <Group mt={24} pb={16}>
        {!isLocked && (
          <Button onClick={addQuestion} color="blue">
            Add Question
          </Button>
        )}

        {!isReleased && questions.length > 0 && (
          <Button color="green" onClick={() => setIsReleaseModalOpen(true)}>
            Confirm and Release Form
          </Button>
        )}

        {isReleased && (
          <Button color="red" onClick={() => setIsRecallModalOpen(true)}>
            Recall Form
          </Button>
        )}
      </Group>

      {/* 4) CSV Upload Modal */}
      <Modal
        opened={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        title="Upload Questions via CSV"
      >
        {csvErrorMessage && (
          <Alert color="red" mb="md">
            {csvErrorMessage}
          </Alert>
        )}

        <Text mb="xs">
          Please upload a CSV that includes valid question types and fields.
          <br />
          NUSNET ID, NUSNET Email, and Team Member Selection rows are skipped automatically.
        </Text>

        <CSVUpload
          warningMessage="Questions uploaded via CSV will be appended to the existing list."
          headers={questionHeaders}
          onProcessComplete={() => {
            handleCsvProcessComplete();
            setIsCsvModalOpen(false);
          }}
          onError={handleCsvError}
          filename="questions_template.csv"
          uploadButtonString="Upload CSV File"
          urlString={`/api/internal-assessments/${assessment?._id}/manyquestions`}
          requestType="POST"
          transformFunction={transformQuestions}
          hideTemplateDownloadButton
        />
      </Modal>

      {/* Release Modal */}
      <Modal
        opened={isReleaseModalOpen}
        onClose={() => setIsReleaseModalOpen(false)}
        title="Confirm and Release Form"
      >
        <Text>
          Are you sure you want to release the form? It will be locked and you cannot
          edit unless you recall it later.
        </Text>
        <Group mt="md">
          <Button color="green" onClick={releaseForm}>
            Yes, Release Form
          </Button>
        </Group>
      </Modal>

      <Modal
        opened={isRecallModalOpen}
        onClose={() => setIsRecallModalOpen(false)}
        title="Recall Form"
      >
        <Text>
          Are you sure you want to recall the form? It will be unlocked and TAs will no
          longer have access.
        </Text>
        <Group mt="md">
          <Button color="red" onClick={recallForm}>
            Yes, Recall Form
          </Button>
        </Group>
      </Modal>
    </div>
  );
};

export default AssessmentInternalForm;
