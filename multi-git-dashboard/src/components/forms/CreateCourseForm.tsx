import {
  Badge,
  Box,
  Button,
  Card,
  CloseButton,
  Collapse,
  List,
  SegmentedControl,
  Select,
  Space,
  Switch,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { CourseType } from '@shared/types/Course';
import { IconBrandGithub, IconCheck } from '@tabler/icons-react';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState } from 'react';

const CARD_W = '210px';
// TODO: Setup webhook receiver to automatically get the org name where user installed GH app
const gitHubNewInstallationUrl =
  'https://github.com/apps/NUS-CRISP/installations/new';

enum InstallationStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
}

interface CreateCourseFormValues {
  name: string;
  code: string;
  semester: string;
  startDate: Date | null;
  duration: number;
  courseType: CourseType;
  gitHubOrgName: string;
  repoNameFilter: string;
  installationId: string;
  isOn: boolean;
  customisedAI: boolean;
  provider: string;
  model: string;
  apiKey: string;
  frequency: string;
  aiStartDate: Date | null;
}

const CreateCourse: React.FC = () => {
  const router = useRouter();
  const apiRoute = '/api/courses';

  const [appInstallationStatus, setAppInstallationStatus] =
    useState<InstallationStatus>(InstallationStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState('');

  const form = useForm<CreateCourseFormValues>({
    initialValues: {
      name: '',
      code: '',
      semester: '',
      startDate: null,
      duration: 13,
      courseType: CourseType.Normal,
      gitHubOrgName: '',
      repoNameFilter: '',
      installationId: '',
      isOn: true,
      customisedAI: false,
      provider: '',
      model: '',
      apiKey: '',
      frequency: '',
      aiStartDate: null,
    },
    validate: {
      name: (value: string) =>
        value.trim().length > 0 ? null : 'Course name is required',
      code: (value: string) =>
        value.trim().length > 0 ? null : 'Course code is required',
      semester: (value: string) =>
        value.trim().length > 0 ? null : 'Semester is required',
      startDate: (value: Date | null) =>
        value ? null : 'Start date is required',
      duration: (value: number) => (value ? null : 'Duration is required'),
      courseType: (value: CourseType) =>
        value ? null : 'Course type is required',
      // field should be valid only if courseType is Normal, or if courseType is GitHubOrg and installation check is successful
      gitHubOrgName: (value: string, values: CreateCourseFormValues) =>
        values.courseType === CourseType.Normal ||
        (values.courseType === CourseType.GitHubOrg &&
          appInstallationStatus === InstallationStatus.SUCCESS)
          ? null
          : 'GitHub Org name is required',
      repoNameFilter: (value: string, values: CreateCourseFormValues) =>
        values.courseType === CourseType.Normal ||
        (values.courseType === CourseType.GitHubOrg &&
          appInstallationStatus === InstallationStatus.SUCCESS)
          ? null
          : 'Repo name filter is required',
      provider: (value: string, values: CreateCourseFormValues) =>
        values.isOn && values.customisedAI
          ? value && value.trim().length > 0
            ? null
            : 'Provider is required'
          : null,
      model: (value: string, values: CreateCourseFormValues) =>
        values.isOn &&
        values.customisedAI &&
        values.provider &&
        modelOptions[values.provider]?.includes(value)
          ? null
          : values.customisedAI
            ? 'Model is missing / invalid'
            : null, // Only validate if 'customisedAI' is ON
      apiKey: (value: string, values: CreateCourseFormValues) =>
        values.isOn &&
        values.customisedAI &&
        values.provider &&
        values.model &&
        value.trim().length > 0
          ? null
          : values.customisedAI
            ? 'Model is missing / invalid'
            : null, // Only validate if 'customisedAI' is ON
      frequency: (value: string, values: CreateCourseFormValues) =>
        values.isOn
          ? value.trim().length
            ? null
            : 'Frequency is required'
          : null,
      aiStartDate: (value: Date | null, values: CreateCourseFormValues) =>
        values.isOn ? (value ? null : 'Start date is required') : null,
    },
  });

  const checkAppInstallation = async (orgName: string) => {
    const checkAppInstallationApiRoute = '/api/github/check-installation';

    setAppInstallationStatus(InstallationStatus.LOADING);
    setErrorMessage('');

    try {
      const response = await fetch(checkAppInstallationApiRoute, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orgName }),
      });

      if (!response.ok) {
        setAppInstallationStatus(InstallationStatus.ERROR);
        const errorData = await response.json();
        setErrorMessage(errorData.message || 'An error occurred');
        return;
      }
      const { installationId } = await response.json();
      form.setFieldValue('installationId', installationId);

      setAppInstallationStatus(InstallationStatus.SUCCESS);
    } catch (error) {
      console.error('Error checking app installation:', error);
      setAppInstallationStatus(InstallationStatus.ERROR);
      setErrorMessage('Failed to connect to the server');
    }
  };

  const handleSubmit = async () => {
    const session = await getSession();
    const accountId = session?.user?.id;

    const response = await fetch(apiRoute, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${accountId}`,
      },
      body: JSON.stringify(form.values),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error creating course:', data);
      return;
    }

    router.push(`/courses/${data._id}?new=true`);
  };

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

  return (
    <Box maw={300} mx="auto">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput
          withAsterisk
          label="Course Name"
          placeholder="Software Engineering Project"
          {...form.getInputProps('name')}
          value={form.values.name}
          onChange={event =>
            form.setFieldValue('name', event.currentTarget.value)
          }
        />
        <TextInput
          withAsterisk
          mt="md"
          label="Course Code"
          placeholder="CS3203"
          {...form.getInputProps('code')}
          value={form.values.code}
          onChange={event =>
            form.setFieldValue('code', event.currentTarget.value)
          }
        />
        <Select
          required
          mt="md"
          comboboxProps={{ withinPortal: true }}
          data={[
            'Ay2023/24 Sem 1',
            'Ay2023/24 Sem 2',
            'Ay2024/25 Sem 1',
            'Ay2024/25 Sem 2',
            'Ay2024/25 Special Term',
          ]}
          placeholder="Choose current semester"
          label="Semester"
          {...form.getInputProps('semester')}
          value={form.values.semester}
          onChange={value => form.setFieldValue('semester', value ?? '')}
        />
        <DatePickerInput
          withAsterisk
          mt="md"
          label="Start Date"
          placeholder="Pick start date"
          error={form.errors.startDate}
          value={form.values.startDate}
          onChange={value => form.setFieldValue('startDate', value)}
        />
        <TextInput
          withAsterisk
          mt="md"
          label="Duration"
          placeholder="13"
          rightSection={<Text style={{ paddingRight: 30 }}> weeks </Text>}
          {...form.getInputProps('duration')}
          value={form.values.duration}
          onChange={event =>
            form.setFieldValue(
              'duration',
              Number(event.currentTarget.value) || 0
            )
          }
        />
        <Space h="md" />
        <Box>
          <Text size="sm" fw={500} mb={3}>
            Course Type
          </Text>
          <SegmentedControl
            data={[
              { value: CourseType.Normal, label: 'Normal' },
              { value: CourseType.GitHubOrg, label: 'GitHub Organisation' },
            ]}
            {...form.getInputProps('courseType')}
          />

          <Collapse in={form.values.courseType === CourseType.GitHubOrg}>
            <Box>
              <Title order={4} my={15}>
                GitHub Org Integration Setup:
              </Title>
              <Card withBorder>
                <List>
                  <List.Item>
                    <Button
                      w={CARD_W}
                      leftSection={<IconBrandGithub size={14} />}
                      variant="default"
                      component="a"
                      href={gitHubNewInstallationUrl}
                      target="_blank"
                    >
                      Install our GitHub App
                    </Button>
                  </List.Item>
                  <Collapse
                    in={appInstallationStatus !== InstallationStatus.SUCCESS}
                    mt="md"
                  >
                    <List.Item>
                      <TextInput
                        withAsterisk
                        label="GitHub Org Name"
                        placeholder="e.g. nus-crisp"
                        {...form.getInputProps('gitHubOrgName')}
                        onChange={event => {
                          form.setFieldValue(
                            'gitHubOrgName',
                            event.currentTarget.value
                          );
                          form.setFieldValue('installationId', '');
                          setAppInstallationStatus(InstallationStatus.IDLE);
                          setErrorMessage('');
                        }}
                      />
                      <Space h="sm" />
                      {errorMessage && (
                        <Text
                          style={{
                            maxWidth: CARD_W,
                          }}
                          c="red"
                        >
                          {errorMessage}
                        </Text>
                      )}
                      <Button
                        type="button"
                        loading={
                          appInstallationStatus === InstallationStatus.LOADING
                        }
                        variant={
                          appInstallationStatus === InstallationStatus.SUCCESS
                            ? 'filled'
                            : 'outline'
                        }
                        color={
                          appInstallationStatus === InstallationStatus.SUCCESS
                            ? 'green'
                            : appInstallationStatus === InstallationStatus.ERROR
                              ? 'red'
                              : 'blue'
                        }
                        rightSection={
                          appInstallationStatus ===
                          InstallationStatus.SUCCESS ? (
                            <IconCheck size={14} />
                          ) : null
                        }
                        onClick={() =>
                          checkAppInstallation(form.values.gitHubOrgName)
                        }
                      >
                        {appInstallationStatus === InstallationStatus.ERROR
                          ? 'Try Again'
                          : 'Check Installation'}
                      </Button>
                    </List.Item>
                  </Collapse>
                  <Collapse
                    in={appInstallationStatus === InstallationStatus.SUCCESS}
                    mt="md"
                  >
                    <List.Item>
                      <Badge
                        variant="outline"
                        color="green"
                        size="lg"
                        rightSection={
                          <CloseButton
                            style={{ color: '#40c057' }} // open-color, green 6
                            onClick={() => {
                              setAppInstallationStatus(InstallationStatus.IDLE);
                              setErrorMessage('');
                              form.setFieldValue('gitHubOrgName', '');
                            }}
                            size={14}
                          />
                        }
                      >
                        {form.values.gitHubOrgName}
                      </Badge>
                      {/* <MultiSelect
                        disabled
                        mt="sm"
                        label="Repositories"
                        placeholder="Pick repos..."
                        data={repoList}
                        hidePickedOptions
                        searchable
                        clearable
                        leftSectionWidth={100}
                      /> */}
                      <TextInput
                        withAsterisk
                        label="Repo Name Filter"
                        placeholder="e.g. 23s2"
                        {...form.getInputProps('repoNameFilter')}
                        onChange={event =>
                          form.setFieldValue(
                            'repoNameFilter',
                            event.currentTarget.value
                          )
                        }
                      />
                    </List.Item>
                  </Collapse>
                </List>
              </Card>
            </Box>
          </Collapse>
        </Box>
        <Space h="md" />
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
                  error={form.errors.aiStartDate}
                  value={form.values.aiStartDate}
                  minDate={
                    new Date(new Date().setDate(new Date().getDate() + 1))
                  } // Only allow from next day onwards
                  onChange={value => form.setFieldValue('aiStartDate', value)}
                />
              </Tooltip>
            </Card>
          </Collapse>
        </Box>
        <Space h="md" mt="md" />
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Button type="submit">Create Course</Button>
        </div>
        <Space mt="md" />
      </form>
    </Box>
  );
};

export default CreateCourse;
