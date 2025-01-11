/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import {
  Button,
  Modal,
  Group,
  Box,
  Text,
  NumberInput,
  Alert,
  Radio,
  TextInput,
  Accordion,
} from '@mantine/core';
import {
  DndContext,
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
} from '@dnd-kit/core';
import {
  arrayMove,
  verticalListSortingStrategy,
  SortableContext,
  useSortable,
  defaultAnimateLayoutChanges,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { InternalAssessment } from '@shared/types/InternalAssessment';
import {
  Question,
  MultipleChoiceQuestion,
  MultipleResponseQuestion,
  NumberQuestion,
  ScaleQuestion,
} from '@shared/types/Question';
import AssessmentMakeQuestionCard from '@/components/cards/AssessmentMakeQuestionCard';
import CSVUpload from '@/components/csv/CSVUpload';

/* ------------------------------------------------------------------
   CSV-related helper values and functions
   ------------------------------------------------------------------ */
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

function transformQuestions(data: any[]): any[] {
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

/** Convert existing questions => CSV string and download. */
function downloadExistingQuestionsCsv(questions: Question[]) {
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

/* ------------------------------------------------------------------
   ReorderItem component for drag-and-drop (DnD Kit)
   ------------------------------------------------------------------ */
function ReorderItem({
  question,
  totalUnlocked,
  onPositionChange,
}: {
  question: Question;
  totalUnlocked: number;
  onPositionChange: (qId: string, newPos: number) => void;
}) {
  const isLocked = question.isLocked;

  // Make the item "sortable" only if unlocked
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: question._id,
    disabled: isLocked,
    animateLayoutChanges: defaultAnimateLayoutChanges,
  });

  const style: React.CSSProperties = {
    transform: isLocked ? undefined : CSS.Transform.toString(transform),
    transition: isLocked ? undefined : transition,
    border: '1px solid #ccc',
    borderRadius: '4px',
    padding: '0.5rem',
    marginBottom: '0.5rem',
    background: isLocked ? '#f3f3f3' : '#fff',
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...(isLocked ? {} : listeners)}
      {...attributes}
    >
      <Group gap="xs" align="center">
        {isLocked ? (
          <Box style={{ width: '100px', textAlign: 'center' }}>
            <Text c="dimmed" size="sm">
              Locked
            </Text>
          </Box>
        ) : (
          <Box
            style={{ width: '100px', display: 'flex', alignItems: 'center' }}
          >
            <NumberInput
              aria-label="Question Number"
              min={1}
              max={totalUnlocked}
              value={question.order ?? 1}
              onChange={val => {
                if (val === undefined) return;
                const newPos = typeof val === 'string' ? parseInt(val) : val;
                onPositionChange(question._id, newPos);
              }}
            />
          </Box>
        )}

        <Box style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <Text>
            {question.text.length > 50
              ? question.text.slice(0, 50) + '...'
              : question.text}
          </Text>
        </Box>
      </Group>
    </Box>
  );
}

/* ------------------------------------------------------------------
   ReorderModal for controlling question order
   ------------------------------------------------------------------ */
function ReorderModal({
  assessmentId,
  sortedQuestions,
  isOpen,
  onClose,
  onSuccess,
}: {
  assessmentId?: string;
  sortedQuestions: Question[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [localQuestions, setLocalQuestions] = useState<Question[]>([]);
  const lockedQuestions = sortedQuestions.filter(q => q.isLocked);

  // Copy sorted questions into local array
  useEffect(() => {
    const copy = sortedQuestions.map(q => ({ ...q }));
    setLocalQuestions(copy);
  }, [sortedQuestions]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  // Drag & drop among unlocked questions
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLocalQuestions(prev => {
      const oldIndex = prev.findIndex(q => q._id === active.id);
      const newIndex = prev.findIndex(q => q._id === over.id);

      // If dragged or drop target is locked, skip
      const draggedItem = prev[oldIndex];
      const dropTargetItem = prev[newIndex];
      if (draggedItem.isLocked || dropTargetItem.isLocked) {
        return prev;
      }

      const newArray = arrayMove(prev, oldIndex, newIndex);
      return reassignUnlockedOrder(newArray);
    });
  };

  // Manual numbering among unlocked
  const handlePositionChange = (qId: string, newPos: number) => {
    setLocalQuestions(prev => {
      // Extract just unlocked
      const unlockedItems = prev.filter(q => !q.isLocked);
      const targetIndex = unlockedItems.findIndex(q => q._id === qId);
      if (targetIndex < 0) return prev;

      const [moved] = unlockedItems.splice(targetIndex, 1);
      const insertionIndex = Math.max(
        0,
        Math.min(newPos - 1, unlockedItems.length)
      );
      unlockedItems.splice(insertionIndex, 0, moved);

      // Rebuild entire array, putting locked items in same positions
      const newArray: Question[] = [];
      let unlockedPointer = 0;
      for (let i = 0; i < prev.length; i++) {
        if (prev[i].isLocked) {
          newArray.push(prev[i]);
        } else {
          newArray.push(unlockedItems[unlockedPointer]);
          unlockedPointer++;
        }
      }
      return reassignUnlockedOrder(newArray);
    });
  };

  function reassignUnlockedOrder(all: Question[]) {
    let counter = 1;
    return all.map(q => {
      // skip positions that might be taken by locked questions
      while (
        lockedQuestions.find(k => k.order === counter) &&
        counter < all.length + lockedQuestions.length + 2
      ) {
        counter++;
      }
      if (!q.isLocked) {
        const updated = { ...q, order: counter };
        counter++;
        return updated;
      } else {
        return q;
      }
    });
  }

  const saveReorder = async () => {
    if (!assessmentId) return;

    try {
      // Final order (locked + unlocked).
      const finalIds = localQuestions.map(q => q._id);

      const response = await fetch(
        `/api/internal-assessments/${assessmentId}/reorder`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: finalIds }),
        }
      );
      if (!response.ok) {
        throw new Error('Failed to reorder questions');
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving reorder:', error);
      alert('Error saving new question order');
    }
  };

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title="Reorder Questions"
      size="lg"
    >
      {localQuestions.length === 0 ? (
        <Alert color="yellow" mb="md">
          No questions found.
        </Alert>
      ) : (
        <>
          <Group gap="xs" justify="space-evenly" mb="xs" ml="md">
            <Text fw={500} style={{ width: '100px' }}>
              Question Number
            </Text>
            <Text fw={500} style={{ flex: 1 }}>
              Question Text
            </Text>
          </Group>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localQuestions.map(q => q._id)}
              strategy={verticalListSortingStrategy}
            >
              <Box
                style={{
                  minHeight: 200,
                  border: '1px dashed #ccc',
                  padding: 8,
                  marginTop: '1rem',
                }}
              >
                {localQuestions.map(q => (
                  <ReorderItem
                    key={q._id}
                    question={q}
                    totalUnlocked={
                      localQuestions.filter(x => !x.isLocked).length
                    }
                    onPositionChange={handlePositionChange}
                  />
                ))}
              </Box>
            </SortableContext>
          </DndContext>
        </>
      )}

      <Group justify="flex-end" mt="lg">
        <Button onClick={saveReorder} disabled={localQuestions.length === 0}>
          Save Reorder
        </Button>
      </Group>
    </Modal>
  );
}

/* ------------------------------------------------------------------
   Main component: merges old features + new reorder logic
   ------------------------------------------------------------------ */
interface AssessmentInternalFormProps {
  assessment: InternalAssessment | null;
  questions: Question[];
  addQuestion: (qNo: number) => void;
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
  // Detect if the entire assessment is locked (released)
  const isAssessmentLocked = assessment?.isReleased || false;
  const isAssessmentReleased = assessment?.isReleased || false;

  /* -----------------------------
     Reorder logic
  ----------------------------- */
  // Sort the incoming questions by their order
  const [sortedQuestions, setSortedQuestions] = useState<Question[]>([]);
  useEffect(() => {
    const sorted = [...questions].sort((a, b) => {
      const orderA = a.order ?? 9999;
      const orderB = b.order ?? 9999;
      return orderA - orderB;
    });
    setSortedQuestions(sorted);
  }, [questions]);

  // Keep track of the next question number for new questions
  const [latestQuestionNumber, setLatestQuestionNumber] = useState(
    questions.length + 1
  );

  // Reorder modal
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);

  const handleAddQuestionClick = () => {
    addQuestion(latestQuestionNumber);
    setLatestQuestionNumber(prev => prev + 1);
  };

  /* -----------------------------
     CSV logic
  ----------------------------- */
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvErrorMessage, setCsvErrorMessage] = useState('');

  const handleCsvError = (message: string) => {
    setCsvErrorMessage(message);
  };

  const handleCsvProcessComplete = () => {
    onAssessmentUpdated();
  };

  /* -----------------------------
     Release / Recall logic
  ----------------------------- */
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [isRecallModalOpen, setIsRecallModalOpen] = useState(false);

  // For recall confirm
  const [recallOption, setRecallOption] = useState<
    'recallOnly' | 'recallAndDelete'
  >(
    assessment
      ? assessment.areSubmissionsEditable
        ? 'recallOnly'
        : 'recallAndDelete'
      : 'recallOnly'
  );
  const [confirmationText, setConfirmationText] = useState('');
  const [isConfirmDisabled, setIsConfirmDisabled] = useState(true);

  useEffect(() => {
    if (!assessment) return;
    const isMatch = confirmationText.trim() === assessment.assessmentName;
    setIsConfirmDisabled(!isMatch);
  }, [confirmationText, assessment]);

  const releaseForm = async () => {
    if (!assessment?._id) return;
    try {
      const response = await fetch(
        `/api/internal-assessments/${assessment._id}/release`,
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

  const recallForm = async (deleteSubmissions: boolean) => {
    if (!assessment?._id) return;
    try {
      // 1) Recall
      const recallResponse = await fetch(
        `/api/internal-assessments/${assessment._id}/recall`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      if (!recallResponse.ok) {
        console.error('Error recalling form:', recallResponse.statusText);
        return;
      }

      // 2) Optionally delete existing submissions
      if (deleteSubmissions) {
        const deleteResponse = await fetch(
          `/api/submissions/bulk-delete/${assessment._id}`,
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
          }
        );
        if (!deleteResponse.ok) {
          console.error(
            'Error soft deleting submissions:',
            deleteResponse.statusText
          );
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

  /* -----------------------------
     Utility: Calculate total possible points
  ----------------------------- */
  const calculateTotalPossiblePoints = (): number => {
    let totalPoints = 0;
    questions.forEach(q => {
      switch (q.type) {
        case 'Multiple Choice': {
          const mc = q as MultipleChoiceQuestion;
          if (mc.isScored && mc.options?.length) {
            const maxOptionPoints = Math.max(
              ...mc.options.map(o => o.points || 0)
            );
            totalPoints += maxOptionPoints;
          }
          break;
        }
        case 'Multiple Response': {
          const mr = q as MultipleResponseQuestion;
          if (mr.isScored && mr.options?.length) {
            // Summation of positive points is the typical logic
            const positivePoints = mr.options
              .map(o => o.points || 0)
              .filter(p => p > 0);
            totalPoints += positivePoints.reduce((sum, p) => sum + p, 0);
          }
          break;
        }
        case 'Scale': {
          const sc = q as ScaleQuestion;
          if (sc.isScored && sc.labels?.length) {
            const maxLabelPoints = Math.max(
              ...sc.labels.map(l => l.points || 0)
            );
            totalPoints += maxLabelPoints;
          }
          break;
        }
        case 'Number': {
          const num = q as NumberQuestion;
          if (num.isScored) {
            if (num.scoringMethod === 'direct') {
              totalPoints += num.maxPoints || 0;
            } else if (num.scoringMethod === 'range' && num.scoringRanges) {
              const maxRangePoints = Math.max(
                ...num.scoringRanges.map(r => r.points || 0)
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
  useEffect(() => {
    setTotalPossiblePoints(calculateTotalPossiblePoints());
  }, [questions]);

  // If scaling is used, display the factor
  const maxMarks = assessment?.maxMarks || 0;
  const [scalingFactor, setScalingFactor] = useState(
    maxMarks && totalPossiblePoints > 0 ? maxMarks / totalPossiblePoints : 1
  );
  useEffect(() => {
    const total = calculateTotalPossiblePoints();
    setTotalPossiblePoints(total);
    const maxMarksLocal = assessment?.maxMarks || 0;
    const scaling = maxMarksLocal && total > 0 ? maxMarksLocal / total : 1;
    setScalingFactor(scaling);
  }, [questions, assessment?.maxMarks]);

  return (
    <div>
      {/* CSV Buttons: only show if not locked */}
      {!isAssessmentLocked && (
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
        {sortedQuestions.map((question, index) => (
          <AssessmentMakeQuestionCard
            key={question._id}
            index={index}
            questionData={question}
            onSave={updatedQuestion =>
              handleSaveQuestion(question._id, updatedQuestion)
            }
            onDelete={() => handleDeleteQuestion(question._id)}
            isLocked={isAssessmentLocked || question.isLocked}
          />
        ))}
      </Box>

      <Box mt={24} pb={16}>
        <Text>Total Possible Points from Questions: {totalPossiblePoints}</Text>
        <Text>Assessment Maximum Marks: {maxMarks}</Text>
        {maxMarks > 0 &&
          totalPossiblePoints > 0 &&
          assessment &&
          assessment.scaleToMaxMarks && (
            <Text>
              Points in this quiz will be adjusted by this factor to match max
              marks: x{scalingFactor.toFixed(2)}
            </Text>
          )}
      </Box>

      <Group mt="md" pb="sm">
        {!isAssessmentLocked && (
          <Button onClick={handleAddQuestionClick} color="blue">
            Add Question
          </Button>
        )}

        {/* Reorder button: only show if not locked */}
        {!isAssessmentLocked && (
          <Button variant="outline" onClick={() => setIsReorderModalOpen(true)}>
            Reorder Questions
          </Button>
        )}

        {/* Release / Recall */}
        {!isAssessmentReleased && sortedQuestions.length > 0 && (
          <Button color="green" onClick={() => setIsReleaseModalOpen(true)}>
            Confirm and Release Form
          </Button>
        )}

        {isAssessmentReleased && (
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
                  &quot;0|10|3;11|20|5&quot; if &quot;scoringMethod&quot; =
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
              onChange={value => {
                if (value === 'recallOnly' || value === 'recallAndDelete')
                  setRecallOption(value);
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
                It is strongly recommended to delete all existing submissions
                since editing will be automatically allowed for outdated
                submissions.
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

      {/* Reorder Modal */}
      <ReorderModal
        assessmentId={assessment?._id}
        sortedQuestions={sortedQuestions}
        isOpen={isReorderModalOpen}
        onClose={() => setIsReorderModalOpen(false)}
        onSuccess={() => {
          onAssessmentUpdated();
          setIsReorderModalOpen(false);
        }}
      />
    </div>
  );
};

export default AssessmentInternalForm;
