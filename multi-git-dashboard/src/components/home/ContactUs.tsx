import {
  ActionIcon,
  Box,
  Button,
  Group,
  SimpleGrid,
  Stack,
  TextInput,
  Textarea,
  Title,
  getGradient,
  useMantineTheme,
} from '@mantine/core';
import classes from '@styles/ContactUs.module.css';
import { IconBrandGithub } from '@tabler/icons-react';
import ContactIcons from './ContactIcons';

const social = [IconBrandGithub];

const ContactUs: React.FC = () => {
  const theme = useMantineTheme();

  const icons = social.map((Icon, index) => (
    <ActionIcon
      key={index}
      size={28}
      className={classes.social}
      variant="transparent"
    >
      <Icon size="1.4rem" stroke={1.5} />
    </ActionIcon>
  ));

  return (
    <Box
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
    </Box>
  );
};

export default ContactUs;
