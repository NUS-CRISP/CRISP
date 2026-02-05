import { Group, Stepper } from '@mantine/core';
import { Text } from '@mantine/core';
import {
  IconCheck,
  IconUsers,
  IconListDetails,
  IconHierarchy2,
  IconFlag,
  IconGitBranch,
  IconRobot,
} from '@tabler/icons-react';

export const ProgressBar = ({
  step,
  setStep,
}: {
  step: number;
  setStep: (step: number) => void;
}) => {
  return (
    <Stepper
      active={step}
      onStepClick={setStep}
      allowNextStepsSelect={false}
      size="md"
      color="blue"
      completedIcon={<IconCheck size={16} />}
      styles={{
        steps: { gap: 4 },
        separator: { flexGrow: 1 },
        step: {
          flexDirection: 'column',
        },
        stepBody: {
          marginTop: 8,
          marginLeft: 0,
        },
        stepIcon: {
          margin: 0,
        },
      }}
    >
      <Stepper.Step
        label={
          <Group gap={6} align="center" justify="center">
            <IconListDetails size={16} />
            <Text size="md">Course Details</Text>
          </Group>
        }
      />
      <Stepper.Step
        label={
          <Group gap={6} align="center" justify="center">
            <IconUsers size={16} />
            <Text size="md">People</Text>
          </Group>
        }
      />
      <Stepper.Step
        label={
          <Group gap={6} align="center" justify="center">
            <IconHierarchy2 size={16} />
            <Text size="md">Teams</Text>
          </Group>
        }
      />
      <Stepper.Step
        label={
          <Group gap={6} align="center" justify="center">
            <IconGitBranch size={16} />
            <Text size="md">Repositories</Text>
          </Group>
        }
      />
      <Stepper.Step
        label={
          <Group gap={6} align="center" justify="center">
            <IconRobot size={16} />
            <Text size="md">AI Insights</Text>
          </Group>
        }
      />
      <Stepper.Step
        label={
          <Group gap={6} align="center" justify="center">
            <IconFlag size={16} />
            <Text size="md">Finish</Text>
          </Group>
        }
      />
    </Stepper>
  );
};

export default ProgressBar;
