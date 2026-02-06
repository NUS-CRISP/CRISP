import { Paper, Group, ThemeIcon, Text, Title, Stack } from '@mantine/core';

type StepIntroProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

const StepIntro = ({ icon, title, description }: StepIntroProps) => {
  return (
    <Paper
      withBorder
      shadow="xs"
      radius="md"
      p="lg"
      mb="lg"
      style={{
        backgroundColor:
          'light-dark(var(--mantine-color-blue-0), var(--mantine-color-dark-5))',
      }}
    >
      <Stack gap={4}>
        <Group align="center" gap="sm">
          <ThemeIcon size={40} radius="xl" variant="light" color="blue">
            {icon}
          </ThemeIcon>
          <Title order={2} fw={600}>
            {title}
          </Title>
        </Group>

        <Text size="md" ml={50}>
          {description}
        </Text>
      </Stack>
    </Paper>
  );
};

export default StepIntro;
