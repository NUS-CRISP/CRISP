import {
  Box,
  Button,
  Group,
  Text,
  Container,
  Flex,
  Stack,
} from '@mantine/core';
import Role from '@shared/types/auth/Role';
import classes from '@styles/Home.module.css';
import { IconArrowRight, IconBrandGithub } from '@tabler/icons-react';
import { signIn } from 'next-auth/react';

const Hero = () => {
  return (
    <div className={classes.heroSection} style={{ marginTop: 0 }}>
      <Container size="lg" className={classes.heroContainer}>
        <div className={classes.heroContent}>
          <Flex direction="column" align="center" className={classes.title}>
            <Box
              style={{
                textAlign: 'left',
                width: 'fit-content',
                paddingLeft: '400px',
                fontFamily: 'Verdana, sans-serif',
                fontWeight: '1000',
              }}
            >
              <Stack spacing={30}>
                <Text component="span" inherit>
                  Code.
                </Text>
                <Text component="span" inherit>
                  Collaborate.
                </Text>
                <Text component="span" inherit>
                  Conquer.
                </Text>
              </Stack>
            </Box>

            <Text
              style={{
                fontSize: '1.5rem',
                opacity: 1,
                marginTop: '1rem',
                paddingLeft: '400px',
                fontFamily: 'Verdana, sans-serif',
                fontWeight: '700',
                whiteSpace: 'nowrap',
                display: 'inline-block',
                paddingTop: '20px',
              }}
              variant="gradient"
              gradient={{ from: 'blue', to: 'cyan' }}
            >
              A fully featured multi-git classroom management solution
            </Text>
          </Flex>

          <Group className={classes.heroControls}>
            <Button
              size="lg"
              className={classes.control}
              variant="gradient"
              gradient={{ from: 'blue', to: 'cyan' }}
              onClick={async () =>
                await signIn('credentials', {
                  callbackUrl: '/courses?trial=true',
                  type: Role.TrialUser,
                })
              }
              rightSection={
                <IconArrowRight size={20} className={classes.arrow} />
              }
            >
              Try it out
            </Button>

            <Button
              component="a"
              href="https://github.com/NUS-CRISP/CRISP"
              size="lg"
              variant="default"
              className={classes.control}
              leftSection={<IconBrandGithub size={20} />}
            >
              GitHub
            </Button>
          </Group>
        </div>
      </Container>
    </div>
  );
};

export default Hero;
