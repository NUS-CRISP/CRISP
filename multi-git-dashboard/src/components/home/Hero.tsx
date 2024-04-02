import { Box, Button, Group, Text, Title } from '@mantine/core';
import Role from '@shared/types/auth/Role';
import classes from '@styles/Home.module.css';
import { IconArrowRight, IconBrandGithub } from '@tabler/icons-react';
import { signIn } from 'next-auth/react';

const Hero: React.FC = () => (
  <Box className={classes.inner}>
    <div className={classes.content}>
      <Title className={classes.title}>
        A{' '}
        <Text
          component="span"
          inherit
          variant="gradient"
          gradient={{ from: 'blue', to: 'cyan' }}
        >
          fully featured
        </Text>{' '}
        multi-git classroom management solution
      </Title>

      <Group className={classes.controls}>
        <Button
          size="xl"
          className={classes.control}
          variant="gradient"
          gradient={{ from: 'blue', to: 'cyan' }}
          onClick={async () =>
            await signIn('credentials', {
              callbackUrl: '/courses?trial=true',
              type: Role.TrialUser,
            })
          }
          rightSection={<IconArrowRight size={20} className={classes.arrow} />}
        >
          Try it out
        </Button>

        <Button
          component="a"
          href="https://github.com/NUS-CRISP/CRISP"
          size="xl"
          variant="default"
          className={classes.control}
          leftSection={<IconBrandGithub size={20} />}
        >
          GitHub
        </Button>
      </Group>
    </div>
  </Box>
);

export default Hero;
