import {
  ActionIcon,
  Box,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  TextInput,
  Textarea,
  Title,
  getGradient,
  useMantineTheme,
  Text,
} from '@mantine/core';
import classes from '@styles/ContactUs.module.css';
import { IconBrandGithub } from '@tabler/icons-react';
import ContactIcons from './ContactIcons';
import bg from '../../../public/bg.svg';
import { useEffect, useRef, useState } from 'react';

const social = [
  {
    icon: IconBrandGithub,
    link: 'https://github.com/NUS-CRISP/CRISP',
  },
];

const AnimatedWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect(); // Animate only once when visible
          }
        });
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(50px)',
        transition: 'all 0.8s ease',
      }}
    >
      {children}
    </div>
  );
};

const ContactUs: React.FC = () => {
  const theme = useMantineTheme();

  const icons = social.map((item, index) => (
    <ActionIcon
      key={index}
      size={28}
      className={classes.social}
      variant="transparent"
      component="a"
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
    >
      <item.icon size="1.4rem" stroke={1.5} />
    </ActionIcon>
  ));

  return (
    <div>
      <AnimatedWrapper>
        <Paper shadow="md" radius="lg">
          <div className={classes.wrapper}>
            <div
              className={classes.contacts}
              style={{ backgroundImage: `url(${bg.src})` }}
            >
              <Text fz="lg" fw={700} className={classes.title} c="#fff">
                Contact information
              </Text>
              <ContactIcons />
              <Group mt="xl">{icons}</Group>
            </div>

            <form
              className={classes.form}
              onSubmit={(event) => event.preventDefault()}
            >
              <Text fz="lg" fw={700} className={classes.title}>
                Get in touch
              </Text>

              <div className={classes.fields}>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <TextInput label="Your name" placeholder="John Doe" />
                  <TextInput
                    label="Your email"
                    placeholder="your@email.com"
                    required
                  />
                </SimpleGrid>

                <TextInput mt="md" label="Subject" placeholder="Subject" required />

                <Textarea
                  mt="md"
                  label="Your message"
                  placeholder="How do I set up a course in CRISP?"
                  minRows={3}
                />

                <Group justify="flex-end" mt="md">
                  <Button type="submit" className={classes.control}>
                    Send message
                  </Button>
                </Group>
              </div>
            </form>
          </div>
        </Paper>
      </AnimatedWrapper>
    </div>
  );
};

export default ContactUs;
