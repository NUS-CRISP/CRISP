/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Button,
  Modal,
  Group,
  Text,
  Box,
  Alert,
  Accordion,
  Radio,
  TextInput,
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

const csvInstructions = [
  '# INSTRUCTIONS:',
  '# Valid question types: Multiple Choice, Multiple Response, Scale,',
  '#   Short Response, Long Response, Date, Number, Undecided.',
  '# Rows with question.type = NUSNET ID, NUSNET Email, Team Member Selection',
  '#   are excluded automatically upon upload.',
].join('\n');

/** Transform function to parse CSV => question objects. */
function transformQuestions(data: any[]): any[] {
  // Filter out NUSNET/TeamMember
  const filteredRows = data.filter(row => {
    return (
      row.type !== 'NUSNET ID' &&
      row.type !== 'NUSNET Email' &&
      row.type !== 'Team Member Selection'
    );
  });

  return filteredRows.map((row, idx) => {
    if (!row.type || !row.text) {
      throw new Error(
        `Row ${idx + 1} is missing required 'type' or 'text' field`
      );
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
      throw new Error(
        `Row ${idx + 1} has unrecognized question type: ${row.type}`
      );
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
      parsedScoringRanges = row.scoringRanges
        .split(';')
        .map((rangeStr: string) => {
          const [minValue, maxValue, points] = rangeStr.split('|');
          if (
            minValue === undefined ||
            maxValue === undefined ||
            points === undefined
          ) {
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

/** Download CSV template with instructions. */
function downloadCsvTemplateWithInstructions() {
  const csvContent =
    csvInstructions + '\n\n' + questionHeaders.join(',') + '\n';

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const filename = 'questions_template_with_instructions.csv';

  const navObj: any = window.navigator;
  if (navObj.msSaveOrOpenBlob) {
    navObj.msSaveOrOpenBlob(blob, filename);
  } else {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/** Convert existing questions => CSV string. */
function downloadExistingQuestionsCsv(questions: Question[]) {
  // Filter out NUSNET/TeamMember
  const filtered = questions.filter(q => {
    return (
      q.type !== 'NUSNET ID' &&
      q.type !== 'NUSNET Email' &&
      q.type !== 'Team Member Selection'
    );
  });

  const rows: string[] = [];
  rows.push(questionHeaders.join(',')); // header row

  filtered.forEach(q => {
    const rowValues = questionHeaders.map(header => {
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

    // Remove linebreaks; join columns with commas
    rows.push(rowValues.map(val => val.replace(/\r?\n|\r/g, ' ')).join(','));
  });

  const csvString = rows.join('\n');

  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8' });
  const filename = 'existing_questions.csv';
  const navObj: any = window.navigator;
  if (navObj.msSaveOrOpenBlob) {
    navObj.msSaveOrOpenBlob(blob, filename);
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
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvErrorMessage, setCsvErrorMessage] = useState('');
  const [recallOption, setRecallOption] = useState<'recallOnly' | 'recallAndDelete'>(
    assessment
      ? assessment.areSubmissionsEditable
        ? 'recallOnly'
        : 'recallAndDelete'
      : 'recallOnly'
  );
  const [confirmationText, setConfirmationText] = useState('');
  const [isConfirmDisabled, setIsConfirmDisabled] = useState(true);

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
        // Optionally, handle error feedback to the user
        return;
      }
      setIsReleaseModalOpen(false);
      onAssessmentUpdated();
    } catch (error) {
      console.error('Error releasing form:', error);
    }
  };

  const recallForm = async (deleteSubmissions: boolean) => {
    try {
      const recallResponse = await fetch(
        `/api/internal-assessments/${assessment?._id}/recall`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!recallResponse.ok) {
        console.error('Error recalling form:', recallResponse.statusText);
        return;
      }

      if (deleteSubmissions) {
        const deleteResponse = await fetch(
          `/api/submissions/bulk-delete/${assessment?._id}`,
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (!deleteResponse.ok) {
          console.error('Error soft deleting submissions:', deleteResponse.statusText);
          return;
        }

        const deleteResult = await deleteResponse.json();
        console.log(deleteResult.message);
      }

      setIsRecallModalOpen(false);
      onAssessmentUpdated();
    } catch (error) {
      console.error('Error recalling form:', error);
    }
  };

  const calculateTotalPossiblePoints = (): number => {
    let totalPoints = 0;
    questions.forEach(question => {
      switch (question.type) {
        case 'Multiple Choice': {
          const mc = question as MultipleChoiceQuestion;
          if (mc.isScored) {
            const maxOptionPoints = Math.max(
              ...mc.options.map(o => o.points || 0)
            );
            totalPoints += maxOptionPoints;
          }
          break;
        }
        case 'Multiple Response': {
          const mr = question as MultipleResponseQuestion;
          if (mr.isScored) {
            const positivePoints = mr.options
              .map(o => o.points || 0)
              .filter(p => p > 0);
            totalPoints += positivePoints.reduce((sum, p) => sum + p, 0);
          }
          break;
        }
        case 'Scale': {
          const sc = question as ScaleQuestion;
          if (sc.isScored) {
            const maxLabelPoints = Math.max(
              ...sc.labels.map(l => l.points || 0)
            );
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
                ...(num.scoringRanges || []).map(r => r.points || 0)
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
    maxMarks && totalPossiblePoints > 0 ? maxMarks / totalPossiblePoints : 1
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

  useEffect(() => {
    if (!assessment) return;
    const isMatch = confirmationText.trim() === assessment.assessmentName;
    setIsConfirmDisabled(!isMatch);
  }, [confirmationText, assessment]);

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

            <Button
              variant="outline"
              onClick={downloadCsvTemplateWithInstructions}
            >
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
            onSave={updatedQuestion =>
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
        {maxMarks &&
          totalPossiblePoints > 0 &&
          assessment &&
          assessment.scaleToMaxMarks && (
            <Text>
              Points in this quiz will be adjusted by this factor to match max
              marks: x{scalingFactor.toFixed(2)}
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

      {/* CSV Upload Modal */}
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

        {/* Drop zone & upload */}
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

        {/* Accordion below the drop zone with formatting instructions */}
        <Accordion mt="md" variant="separated" defaultValue={null}>
          <Accordion.Item value="formatting">
            <Accordion.Control>
              Question CSV Formatting Instructions
            </Accordion.Control>
            <Accordion.Panel>
              <Text size="sm" mb="xs">
                Ensure cells with data are set to "Text" format. Each row
                represents a single question with the following columns:
              </Text>
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                <li>
                  <strong>type</strong>: one of &quot;Multiple Choice&quot;,
                  &quot;Multiple Response&quot;, &quot;Scale&quot;, &quot;Short
                  Response&quot;, &quot;Long Response&quot;, &quot;Date&quot;,
                  &quot;Number&quot;, or &quot;Undecided&quot;.
                </li>
                <li>
                  <strong>text</strong>: the question prompt (required).
                </li>
                <li>
                  <strong>isRequired</strong>: &quot;true&quot; or
                  &quot;false&quot;.
                </li>
                <li>
                  <strong>isLocked</strong>: &quot;true&quot; or
                  &quot;false&quot;.
                </li>
                <li>
                  <strong>customInstruction</strong>: additional instructions
                  (optional).
                </li>
                <li>
                  <strong>isScored</strong>: &quot;true&quot; or
                  &quot;false&quot;. If true, extra fields like
                  &quot;options&quot; or &quot;labels&quot; may apply.
                </li>
                <li>
                  <strong>options</strong>: e.g. &quot;Option1|2;Option2|5&quot;
                  for multiple choice or response.
                </li>
                <li>
                  <strong>allowNegative</strong>: &quot;true&quot; or
                  &quot;false&quot; (Multiple Response).
                </li>
                <li>
                  <strong>areWrongAnswersPenalized</strong>: &quot;true&quot; or
                  &quot;false&quot; (Multiple Response).
                </li>
                <li>
                  <strong>allowPartialMarks</strong>: &quot;true&quot; or
                  &quot;false&quot; (Multiple Response).
                </li>
                <li>
                  <strong>scaleMax</strong>: number if &quot;type&quot; is
                  &quot;Scale&quot;.
                </li>
                <li>
                  <strong>labels</strong>: e.g. &quot;1|Min|0;5|Max|5&quot; for
                  &quot;Scale&quot;.
                </li>
                <li>
                  <strong>maxNumber</strong>: numeric limit for
                  &quot;Number&quot; question.
                </li>
                <li>
                  <strong>scoringMethod</strong>: &quot;direct&quot;,
                  &quot;range&quot;, or &quot;None&quot; (Number).
                </li>
                <li>
                  <strong>maxPoints</strong>: numeric max points for
                  &quot;Number&quot; if &quot;scoringMethod&quot; =
                  &quot;direct&quot;.
                </li>
                <li>
                  <strong>scoringRanges</strong>: e.g.
                  &quot;0|10|3;11|20|5&quot; if &quot;scoringMethod&quot;=
                  &quot;range&quot; (Number).
                </li>
                <li>
                  <strong>shortResponsePlaceholder</strong>: for &quot;Short
                  Response&quot;.
                </li>
                <li>
                  <strong>longResponsePlaceholder</strong>: for &quot;Long
                  Response&quot;.
                </li>
                <li>
                  <strong>isRange</strong>: &quot;true&quot; or
                  &quot;false&quot; (Date).
                </li>
                <li>
                  <strong>datePickerPlaceholder</strong>: optional placeholder
                  for &quot;Date&quot;.
                </li>
                <li>
                  <strong>minDate</strong>, <strong>maxDate</strong>: optional
                  date constraints for &quot;Date&quot; question.
                </li>
              </ul>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Modal>

      {/* Release Modal */}
      <Modal
        opened={isReleaseModalOpen}
        onClose={() => setIsReleaseModalOpen(false)}
        title="Confirm and Release Form"
      >
        <Text>
          Are you sure you want to release the form? It will be locked and you
          cannot edit unless you recall it later.
        </Text>
        <Group mt="md">
          <Button color="green" onClick={releaseForm}>
            Yes, Release Form
          </Button>
        </Group>
      </Modal>

      {/* Recall Modal */}
      <Modal
        opened={isRecallModalOpen}
        onClose={() => setIsRecallModalOpen(false)}
        title="Recall Form"
      >
        {assessment && (
          <>
            <Text mb="sm">
              {assessment.areSubmissionsEditable
                ? 'The assessment allows editing of submissions. How would you like to proceed?'
                : 'Editing of submissions will be automatically allowed for outdated submissions. How would you like to proceed?'}
            </Text>

            <Radio.Group
              value={recallOption}
              onChange={(value) => {
                if (value === 'recallOnly' || value === 'recallAndDelete') setRecallOption(value)
              }}
              required
              variant="vertical"
              mb="sm"
            >
              <Radio
                mb="sm"
                value="recallAndDelete"
                label="Recall form and delete all existing submissions"
              />
              <Radio
                mb="sm"
                value="recallOnly"
                label="Recall form only (retain all existing submissions)"
              />
            </Radio.Group>

            {!assessment.areSubmissionsEditable && (
              <Alert color="yellow" mb="sm">
                It is strongly recommended to delete all existing submissions since editing will be automatically allowed for outdated submissions.
              </Alert>
            )}

            <Text mb="xs">
              To confirm, please type the name of the assessment:
              <strong> {assessment.assessmentName}</strong>
            </Text>
            <TextInput
              placeholder="Type assessment name here"
              value={confirmationText}
              onChange={e => setConfirmationText(e.target.value)}
              mb="sm"
            />

            <Group justify="flex-end" mt="md">
              <Button
                color="red"
                onClick={() => recallForm(recallOption === 'recallAndDelete')}
                disabled={isConfirmDisabled}
              >
                Confirm Recall
              </Button>
            </Group>
          </>
        )}
      </Modal>
    </div>
  );
};

export default AssessmentInternalForm;
