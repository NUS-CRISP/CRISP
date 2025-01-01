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
import { Question } from '@shared/types/Question';
import AssessmentMakeQuestionCard from '@/components/cards/AssessmentMakeQuestionCard';

interface AssessmentInternalFormProps {
  assessment: InternalAssessment | null;
  questions: Question[];
  addQuestion: (qNo: number) => void;
  handleSaveQuestion: (id: string, updatedQuestion: Question) => void;
  handleDeleteQuestion: (id: string) => void;
  onAssessmentUpdated: () => void;
}

/**
 * Displays a row with:
 * - If locked: "Locked" placeholder (non-draggable, no NumberInput).
 * - If unlocked: NumberInput + question text, and is draggable.
 */
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
              // Key fix: rely solely on question.order (assigned by reassignUnlockedOrder)
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

const AssessmentInternalForm: React.FC<AssessmentInternalFormProps> = ({
  assessment,
  questions,
  addQuestion,
  handleSaveQuestion,
  handleDeleteQuestion,
  onAssessmentUpdated,
}) => {
  const isAssessmentLocked = assessment?.isReleased || false;

  // Sort the incoming questions by .order
  const [sortedQuestions, setSortedQuestions] = useState<Question[]>([]);
  useEffect(() => {
    const sorted = [...questions].sort((a, b) => {
      const orderA = a.order ?? 9999;
      const orderB = b.order ?? 9999;
      return orderA - orderB;
    });
    setSortedQuestions(sorted);
  }, [questions]);

  const [latestQuestionNumber, setLatestQuestionNumber] = useState(
    questions.length + 1
  );
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);

  const handleAddQuestionClick = () => {
    addQuestion(latestQuestionNumber);
    setLatestQuestionNumber(prev => prev + 1);
  };

  return (
    <div>
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

      <Group mt="md">
        {!isAssessmentLocked && (
          <Button onClick={handleAddQuestionClick} color="blue">
            Add Question
          </Button>
        )}

        {!isAssessmentLocked && (
          <Button variant="outline" onClick={() => setIsReorderModalOpen(true)}>
            Reorder Questions
          </Button>
        )}
      </Group>

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

  function reassignUnlockedOrder(all: Question[]) {
    let counter = 1;
    return all.map(q => {
      while (
        lockedQuestions.find(q => q.order === counter) &&
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

export default AssessmentInternalForm;
