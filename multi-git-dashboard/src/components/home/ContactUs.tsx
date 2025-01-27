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

const social = [
  {
    icon: IconBrandGithub,
    link: 'https://github.com/NUS-CRISP/CRISP',
  },
];

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
      {/* <Box
        className={classes.wrapper}
        style={{
          backgroundImage: getGradient({ from: 'blue', to: 'cyan' }, theme),
        }}
      >
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={50}>
          <Stack justify="center">
            <Title className={classes.title} mb={30}>
              Contact us
            </Title>
            <ContactIcons />
            <Group mt="xl">{icons}</Group>
          </Stack>
          <div className={classes.form}>
            <TextInput
              label="Email"
              placeholder="your@email.com"
              required
              classNames={{ input: classes.input, label: classes.inputLabel }}
            />
            <TextInput
              label="Name"
              placeholder="John Doe"
              mt="md"
              classNames={{ input: classes.input, label: classes.inputLabel }}
            />
            <Textarea
              required
              label="Your message"
              placeholder="How do I setup CRISP for my course?"
              minRows={4}
              mt="md"
              classNames={{ input: classes.input, label: classes.inputLabel }}
            />

            <Group justify="flex-end" mt="md">
              <Button className={classes.control}>Send message</Button>
            </Group>
          </div>
        </SimpleGrid>
      </Box> */}

      <Paper shadow="md" radius="lg">
        <div className={classes.wrapper}>
          <div className={classes.contacts} style={{ backgroundImage: `url(${bg.src})` }}>
            <Text fz="lg" fw={700} className={classes.title} c="#fff">
              Contact information
            </Text>

            <ContactIcons />
          </div>

          <form className={classes.form} onSubmit={(event) => event.preventDefault()}>
            <Text fz="lg" fw={700} className={classes.title}>
              Get in touch
            </Text>

            <div className={classes.fields}>
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput label="Your name" placeholder="John Doe" />
                <TextInput label="Your email" placeholder="your@email.com" required />
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
    </div>
  );
};

export default ContactUs;
