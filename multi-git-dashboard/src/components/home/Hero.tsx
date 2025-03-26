import { Button, Group, Container, Image } from '@mantine/core';
import Role from '@shared/types/auth/Role';
import classes from '@styles/Home.module.css';
import { IconArrowRight, IconBrandGithub } from '@tabler/icons-react';
import { signIn } from 'next-auth/react';

const Hero = () => {
  return (
    <div className={classes.heroSection} style={{ marginTop: 0 }}>
      <Container
        size="lg"
        className={classes.heroContainer}
        style={{ textAlign: 'center' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '60px',
          }}
        >
          <Image
            src="./crisp_diagram.png"
            alt="CRISP Platform Diagram"
            style={{
              width: '700px',
              maxWidth: '95%',
              borderRadius: '10px',
              boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
            }}
          />
        </div>

        <Group justify="center" className={classes.heroControls}>
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
      </Container>
    </div>
  );
};

export default Hero;
