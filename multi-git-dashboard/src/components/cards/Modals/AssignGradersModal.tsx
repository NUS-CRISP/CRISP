import React, { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  NumberInput,
  Switch,
  Button,
  Group,
  Alert,
} from '@mantine/core';
import { IconAlertCircle, IconUserPlus } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface AssignGradersModalProps {
  opened: boolean;
  onClose: () => void;
  courseId: string;
  assessmentId: string;
  onAssigned: () => void;
}

const AssignGradersModal: React.FC<AssignGradersModalProps> = ({
  opened,
  onClose,
  courseId,
  assessmentId,
  onAssigned,
}) => {
  const [numGraders, setNumGraders] = useState<number>(1);
  const [allowSupervisingTAs, setAllowSupervisingTAs] =
    useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [taCount, setTaCount] = useState<number>(0);

  // Fetch TA count for the course
  useEffect(() => {
    if (!opened || !courseId) return;

    const fetchTACount = async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}/people`);
        if (!res.ok) return;
        const data = await res.json();
        setTaCount(data.TAs?.length || 0);
      } catch (err) {
        console.error('Failed to fetch TA count:', err);
      }
    };

    fetchTACount();
  }, [opened, courseId]);

  const handleAssign = async () => {
    if (!numGraders || numGraders < 1 || numGraders > taCount) {
      notifications.show({
        color: 'red',
        title: 'Invalid input',
        message: `Number of graders must be between 1 and ${taCount}.`,
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/peer-review-assessments/${courseId}/${assessmentId}/assign-graders`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            numGradersPerSubmission: numGraders,
            allowSupervisingTAs,
          }),
        }
      );

      const text = await res.text();
      if (!res.ok) throw new Error(text || res.statusText);

      notifications.show({
        color: 'green',
        title: 'Success',
        message: 'Graders assigned to all submissions.',
      });

      onAssigned();
      onClose();
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Assignment failed',
        message: 'Failed to assign graders: ' + (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Assign Graders" centered>
      <Stack gap="md">
        <Alert icon={<IconAlertCircle />} color="blue" variant="light">
          This will assign TAs as graders to all peer review submissions.
        </Alert>

        <NumberInput
          label="Graders per submission"
          description={`Select between 1 and ${taCount} graders.`}
          placeholder="1"
          min={1}
          max={taCount}
          value={numGraders}
          onChange={val => setNumGraders(Number(val) || 1)}
          required
        />

        <Switch
          label="Allow TAs to grade their own supervising teams"
          description="If disabled, TAs will not be assigned to grade submissions from teams they supervise."
          checked={allowSupervisingTAs}
          onChange={e => setAllowSupervisingTAs(e.currentTarget.checked)}
        />

        <Group justify="flex-end" mt="md">
          <Button
            leftSection={<IconUserPlus size={16} />}
            onClick={handleAssign}
            loading={loading}
            disabled={taCount === 0}
          >
            Assign Graders
          </Button>
          <Button variant="subtle" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default AssignGradersModal;
