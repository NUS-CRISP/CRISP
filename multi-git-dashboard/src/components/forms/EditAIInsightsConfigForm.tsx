import {
  Box,
  Button,
  Card,
  Collapse,
  Notification,
  Select,
  Space,
  Switch,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { getSession } from 'next-auth/react';
import { useState } from 'react';

interface EditAIInsightsConfigFormValues {
  isOn: boolean;
  customisedAI: boolean;
  provider: string;
  model: string;
  apiKey: string;
  frequency: string;
  startDate: Date | null;
}

interface EditAIInsightsConfigFormProps {
  courseId: string;
  aiInsights?: {
    isOn: boolean;
    provider: string;
    model: string;
    apiKey: string;
    frequency: string;
    startDate: Date | null;
  };
  closeModal: () => void;
}

const EditAIInsightsConfigForm = ({
  courseId,
  aiInsights,
  closeModal,
}: EditAIInsightsConfigFormProps) => {
  const [error, setError] = useState<string | null>(null);
  const apiRoute = `/api/courses/${courseId}`;

  const form = useForm<EditAIInsightsConfigFormValues>({
    initialValues: {
      isOn: aiInsights?.isOn || false,
      customisedAI: aiInsights?.provider ? true : false,
      provider: aiInsights?.provider || '',
      model: aiInsights?.model || '',
      apiKey: aiInsights?.apiKey || '',
      frequency: aiInsights?.frequency || '',
      startDate: aiInsights?.startDate ? new Date(aiInsights.startDate) : null,
    },
    validate: {
      provider: (value: string, values: EditAIInsightsConfigFormValues) =>
        values.isOn && values.customisedAI
          ? value && value.trim().length > 0
            ? null
            : 'Provider is required'
          : null,
      model: (value: string, values: EditAIInsightsConfigFormValues) =>
        values.isOn &&
        values.customisedAI &&
        values.provider &&
        modelOptions[values.provider]?.includes(value)
          ? null
          : values.customisedAI
            ? 'Model is missing / invalid'
            : null, // Only validate if 'customisedAI' is ON
      apiKey: (value: string, values: EditAIInsightsConfigFormValues) =>
        values.isOn &&
        values.customisedAI &&
        values.provider &&
        values.model &&
        value.trim().length > 0
          ? null
          : values.customisedAI
            ? 'Model is missing / invalid'
            : null, // Only validate if 'customisedAI' is ON
      frequency: (value: string, values: EditAIInsightsConfigFormValues) =>
        values.isOn
          ? value.trim().length
            ? null
            : 'Frequency is required'
          : null,
      startDate: (
        value: Date | null,
        values: EditAIInsightsConfigFormValues
      ) => (values.isOn ? (value ? null : 'Start date is required') : null),
    },
  });

  const modelOptions: Record<string, string[]> = {
    Gemini: [
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.0-flash',
    ],
    OpenAI: [
      'gpt-3.5-turbo',
      'gpt-4o-mini',
      'gpt-4o',
      'gpt-4.5-preview',
      'o1-mini',
      'o1',
    ],
    DeepSeek: ['deepseek-chat', 'deepseek-reasoner'],
  };

  const handleSubmit = async () => {
    const session = await getSession();
    const accountId = session?.user?.id;

    const aiInsightsBody: Partial<EditAIInsightsConfigFormValues> = {};
    aiInsightsBody.isOn = form.values.isOn;
    if (form.values.isOn) {
      aiInsightsBody.startDate = form.values.startDate;
      aiInsightsBody.frequency = form.values.frequency;
      if (form.values.customisedAI) {
        aiInsightsBody.provider = form.values.provider;
        aiInsightsBody.model = form.values.model;
        aiInsightsBody.apiKey = form.values.apiKey;
      }
    }

    const response = await fetch(apiRoute, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${accountId}`,
      },
      body: JSON.stringify({
        aiInsights: aiInsightsBody,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error updating AI Insights:', data);
      setError('Error updating AI Insights. Please try again.');
      return;
    }

    closeModal();
  };

  return (
    <Box maw={300} mx="auto">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        {error && (
          <Notification
            title="Error"
            color="red"
            onClose={() => setError(null)}
          >
            {error}
          </Notification>
        )}

        <Box>
          <Tooltip
            label="Enable using AI to generate insights for each group based on their code analysis metrics."
            refProp="rootRef"
          >
            <Switch
              defaultChecked
              label="AI Insights"
              size="lg"
              {...form.getInputProps('isOn', { type: 'checkbox' })}
            />
          </Tooltip>
          <Collapse in={form.values.isOn}>
            <Title order={4} my={15}>
              AI Insights Setup:
            </Title>
            <Card withBorder>
              <Switch
                onLabel="Input your own model and API key"
                offLabel="Use default gemini-1.5-pro model"
                size="xl"
                {...form.getInputProps('customisedAI', { type: 'checkbox' })}
              />
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
              <Tooltip label="How often to generate ai insights for each group">
                <Select
                  required
                  comboboxProps={{ withinPortal: true }}
                  data={[
                    'Daily',
                    'Weekly',
                    'Fortnightly',
                    'Every 4 weeks (~Monthly)',
                  ]}
                  placeholder="Choose generation frequency"
                  label="Generation Frequency"
                  {...form.getInputProps('frequency')}
                  onChange={value => {
                    const updatedFrequency =
                      value === 'Every 4 weeks (~Monthly)'
                        ? 'Monthly'
                        : value || '';
                    form.setFieldValue('frequency', updatedFrequency);
                  }}
                />
              </Tooltip>
              <Space h="sm" />
              <Tooltip label="Starting date for AI insights generation. First scan will be performed on this date">
                <DatePickerInput
                  withAsterisk
                  label="Start Date"
                  placeholder="Pick start date"
                  error={form.errors.startDate}
                  value={form.values.startDate}
                  minDate={
                    new Date(new Date().setDate(new Date().getDate() + 1))
                  } // Only allow from next day onwards
                  {...form.getInputProps('startDate')}
                  onChange={value => form.setFieldValue('startDate', value)}
                />
              </Tooltip>
            </Card>
          </Collapse>
        </Box>
        <Space h="md" mt="md" />
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Button type="submit">Update</Button>
        </div>
        <Space mt="md" />
      </form>
    </Box>
  );
};

export default EditAIInsightsConfigForm;
