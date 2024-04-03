import { tutorialContents } from '@/lib/utils';
import {
  Button,
  FloatingPosition,
  Group,
  Popover,
  Stack,
  Text,
} from '@mantine/core';
import classes from '@styles/TutorialPopover.module.css';
import { useRouter } from 'next/router';
import { ReactNode } from 'react';
import { useTutorialContext } from './TutorialContext';

interface TutorialPopoverProps {
  stage: number;
  position?: FloatingPosition;
  children: ReactNode;
  hideButton?: boolean;
  disabled?: boolean;
  offset?: number;
  w?: number;
  finish?: boolean;
}

const TutorialPopover: React.FC<TutorialPopoverProps> = ({
  stage,
  position,
  hideButton = false,
  disabled = false,
  offset,
  w,
  finish,
  children,
}) => {
  const { curTutorialStage, nextTutorialStage, startTutorial } =
    useTutorialContext();

  const router = useRouter();

  return (
    <Popover
      width={w ?? 200}
      position={position}
      withArrow
      classNames={{
        arrow:
          position === undefined
            ? classes['arrow-bottom']
            : classes[`arrow-${position.split('-')[0]}`],
      }}
      arrowSize={18}
      shadow="md"
      offset={offset ?? 12}
      opened={curTutorialStage === stage}
      disabled={disabled}
    >
      <Popover.Target>{children}</Popover.Target>
      <Popover.Dropdown className={classes.popoverDropdown}>
        <Stack>
          <Text>
            {finish
              ? 'Remember, you can ask for help here if you get stuck with anything. Feel free to try out anything you want with this trial account. Enjoy! 🎉'
              : tutorialContents[stage]}
          </Text>
          {!hideButton && (
            <Group justify="center">
              {finish && (
                <Button
                  variant="outline"
                  onClick={() => {
                    startTutorial();
                    router.push('/courses');
                  }}
                >
                  Restart
                </Button>
              )}
              <Button variant="outline" onClick={nextTutorialStage}>
                {finish ? 'Finish' : 'Next'}
              </Button>
            </Group>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};

export default TutorialPopover;
