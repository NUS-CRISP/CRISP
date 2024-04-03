import {
  Button,
  Container,
  Overlay,
  Stack,
  Text,
  Title,
  Transition,
} from '@mantine/core';
import classes from '@styles/WelcomeMessage.module.css';
import { IconArrowRight } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useTutorialContext } from '../tutorial/TutorialContext';

const WelcomeMessage: React.FC<{ opened: boolean }> = ({ opened }) => {
  const TRANSITION_DURATION = 500;

  const { nextTutorialStage } = useTutorialContext();

  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (opened && !started) {
      setStarted(true);
    }
  }, [opened]);

  return (
    <Overlay color="#000" backgroundOpacity={0.35} blur={15}>
      <Container mt={100} size="xs">
        <Stack align="center">
          <Transition
            mounted={started}
            transition="fade-up"
            duration={TRANSITION_DURATION}
            timingFunction="ease"
          >
            {styles => (
              <Title size={'3rem'} style={styles}>
                Welcome to CRISP!
              </Title>
            )}
          </Transition>
          <Transition
            mounted={started}
            transition="fade-up"
            duration={TRANSITION_DURATION}
            timingFunction="ease"
          >
            {styles => (
              <Stack
                style={{ ...styles, transitionDelay: '1s' }}
                align="center"
              >
                <Text mt={20} size="lg">
                  Let's get you started with a quick tour of the platform.
                </Text>
                <Button
                  variant="gradient"
                  className={classes.control}
                  gradient={{ from: 'blue', to: 'cyan' }}
                  onClick={nextTutorialStage}
                  mt={20}
                  size="lg"
                  rightSection={
                    <IconArrowRight size={20} className={classes.arrow} />
                  }
                >
                  Let's go!
                </Button>
              </Stack>
            )}
          </Transition>
        </Stack>
      </Container>
    </Overlay>
  );
};

export default WelcomeMessage;
