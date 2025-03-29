import { Button, Group, Container } from '@mantine/core';
import Role from '@shared/types/auth/CrispRole';
import classes from '@styles/Home.module.css';
import { IconArrowRight, IconBrandGithub } from '@tabler/icons-react';
import { signIn } from 'next-auth/react';
import NextImage from 'next/image';
import diagramImage from '@public/diagram.png';

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
          <div
            style={{
              position: 'relative',
              width: '700px',
              maxWidth: '95%',
              height: '400px', // Set an appropriate height for your image
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
            }}
          >
            <NextImage
              src={diagramImage}
              alt="CRISP Platform Diagram"
              layout="fill"
              objectFit="contain"
              priority
            />
          </div>
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
