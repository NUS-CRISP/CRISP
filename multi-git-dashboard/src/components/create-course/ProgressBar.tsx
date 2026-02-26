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
      color="green"
      completedIcon={<IconCheck size={25} />}
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
            <IconListDetails size={20} />
            <Text size="lg">Course Details</Text>
          </Group>
        }
      />
      <Stepper.Step
        label={
          <Group gap={6} align="center" justify="center">
            <IconUsers size={20} />
            <Text size="lg">People</Text>
          </Group>
        }
      />
      <Stepper.Step
        label={
          <Group gap={6} align="center" justify="center">
            <IconHierarchy2 size={20} />
            <Text size="lg">Teams</Text>
          </Group>
        }
      />
      <Stepper.Step
        label={
          <Group gap={6} align="center" justify="center">
            <IconGitBranch size={20} />
            <Text size="lg">Repositories</Text>
          </Group>
        }
      />
      <Stepper.Step
        label={
          <Group gap={6} align="center" justify="center">
            <IconRobot size={20} />
            <Text size="lg">AI Insights</Text>
          </Group>
        }
      />
      <Stepper.Step
        label={
          <Group gap={6} align="center" justify="center">
            <IconFlag size={20} />
            <Text size="lg">Finish</Text>
          </Group>
        }
      />
    </Stepper>
  );
};

export default ProgressBar;
