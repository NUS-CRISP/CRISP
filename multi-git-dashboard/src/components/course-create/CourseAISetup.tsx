import {
  ActionIcon,
  Card,
  Collapse,
  Group,
  Select,
  Space,
  Switch,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { UseFormReturnType } from '@mantine/form';
import { IconHelpCircle } from '@tabler/icons-react';
import { CreateCourseFormValues } from './types';

interface Props {
  form: UseFormReturnType<CreateCourseFormValues>;
  modelOptions: Record<string, string[]>;
}

  export const CourseAISetup = ({ form, modelOptions }: Props) => {
  return (
    <>
      <Title order={4} mt="md" mb="xs">
        AI Insights
      </Title>
      <Text size="sm" c="dimmed" mb="md">
        Configure model and frequency of AI generated insights on teams&apos;
        codebase.
      </Text>
      <Switch
        defaultChecked
        label="Enable AI Insights"
        size="md"
        mb={15}
        {...form.getInputProps('isOn', { type: 'checkbox' })}
      />
      <Collapse in={form.values.isOn}>
        <Card withBorder>
          <Group gap={6}>
            <Switch
              label="Use Customised AI Model"
              size="sm"
              {...form.getInputProps('customisedAI', {
                type: 'checkbox',
              })}
            />
            <Tooltip
              label="By default, we use the gemini-1.5-pro model. You can input your own model and API key to use customised AI model."
              withinPortal
              multiline
              w={300}
            >
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                aria-label="AI Insights help"
              >
                <IconHelpCircle size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Space h="sm" />
          <Collapse in={form.values.customisedAI}>
            <Select
              required
              comboboxProps={{ withinPortal: true }}
              data={['Gemini', 'OpenAI', 'DeepSeek']}
              placeholder="Choose AI provider"
              label="AI Provider"
              {...form.getInputProps('provider')}
              value={form.values.provider}
            />
            <Space h="sm" />
            <Select
              required
              disabled={!form.values.provider}
              comboboxProps={{ withinPortal: true }}
              data={modelOptions[form.values.provider] || []}
              placeholder="Choose AI model"
              label="AI model"
              {...form.getInputProps('model')}
              value={form.values.model}
            />
            <Space h="sm" />
            <TextInput
              withAsterisk
              label="API Key"
              disabled={!form.values.provider || !form.values.model}
              placeholder="e.g. 123456"
              {...form.getInputProps('apiKey')}
              value={form.values.apiKey}
            />
          </Collapse>
          <Space h="sm" />
          <Group gap={6}>
            <Select
              required
              comboboxProps={{ withinPortal: true }}
              data={[
                'Daily',
                'Weekly',
                'Fortnightly',
                'Every 4 weeks (~Monthly)',
              ]}
              placeholder="Choose insight generation frequency"
              label="AI Insight Frequency"
              value={
                form.values.frequency === 'Monthly'
                  ? 'Every 4 weeks (~Monthly)'
                  : form.values.frequency || null
              }
              onChange={value => {
                form.setFieldValue(
                  'frequency',
                  value === 'Every 4 weeks (~Monthly)' ? 'Monthly' : value || ''
                );
              }}
            />
            <Tooltip label="How often to generate AI insights for each group">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                aria-label="AI Insights help"
              >
                <IconHelpCircle size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Space h="sm" />
          <Group gap={6}>
            <DatePickerInput
              withAsterisk
              label="Start Date"
              placeholder="Pick start date"
              error={form.errors.aiStartDate}
              value={form.values.aiStartDate}
              minDate={new Date(new Date().setDate(new Date().getDate() + 1))}
              onChange={value => form.setFieldValue('aiStartDate', value)}
            />
            <Tooltip label="Pick the start date for generating AI insights">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                aria-label="AI Insights help"
              >
                <IconHelpCircle size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Card>
      </Collapse>
    </>
  );
};
