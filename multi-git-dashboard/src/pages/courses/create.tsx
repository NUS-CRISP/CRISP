import {
  ActionIcon,
  Box,
  Button,
  Card,
  Collapse,
  Group,
  SegmentedControl,
  Select,
  Space,
  Stack,
  Stepper,
  Switch,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { CourseType } from '@shared/types/Course';
import {
  IconBrandGithub,
  IconCheck,
  IconFlag,
  IconGitBranch,
  IconHelpCircle,
  IconHierarchy2,
  IconListDetails,
  IconRobot,
  IconUsers,
} from '@tabler/icons-react';

const CARD_W = '210px';
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

const TOTAL_STEPS = 6;

const CreateCoursePage = () => {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      courseType: CourseType.GitHubOrg,
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
      gitHubOrgName: (value: string, values: CreateCourseFormValues) =>
        values.courseType === CourseType.Normal ||
        (values.courseType === CourseType.GitHubOrg &&
          appInstallationStatus === InstallationStatus.SUCCESS)
          ? null
          : 'GitHub Organisation name is required',
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
            : null,
      apiKey: (value: string, values: CreateCourseFormValues) =>
        values.isOn &&
        values.customisedAI &&
        values.provider &&
        values.model &&
        value.trim().length > 0
          ? null
          : values.customisedAI
            ? 'Model is missing / invalid'
            : null,
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

  const stepFields: (keyof CreateCourseFormValues)[][] = [
    ['name', 'code', 'semester', 'startDate', 'duration'], // Course details
    [], // People
    [], // Team allocation
    ['courseType', 'gitHubOrgName', 'repoNameFilter'], // Repositories
    ['frequency', 'aiStartDate', 'provider', 'model', 'apiKey'], // AI insights
    [], // Review
  ];

  const apiRoute = '/api/courses';

  const validateCurrentStep = (): boolean => {
    const fields = stepFields[step];
    if (fields.length === 0) return true;
    let valid = true;
    for (const field of fields) {
      const result = form.validateField(field);
      if (result.hasError) valid = false;
    }
    return valid;
  };

  const checkAppInstallation = async (orgName: string) => {
    const checkAppInstallationApiRoute = '/api/github/check-installation';
    setAppInstallationStatus(InstallationStatus.LOADING);
    setErrorMessage('');
    try {
      const response = await fetch(checkAppInstallationApiRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // If navigated with /courses/create?courseId=..., load existing draft
  useEffect(() => {
    if (!router.isReady) return;
    const idParam = router.query.courseId;
    const id = Array.isArray(idParam) ? idParam[0] : idParam;
    if (!id) return;
    setCourseId(id);
    const loadDraft = async () => {
      try {
        const res = await fetch(`/api/courses/${id}`);
        if (!res.ok) return;
        const course = await res.json();
        form.setValues({
          name: course.name ?? '',
          code: course.code ?? '',
          semester: course.semester ?? '',
          startDate: course.startDate ? new Date(course.startDate) : null,
          duration: course.durationWeeks ?? 13,
          courseType: course.courseType ?? CourseType.GitHubOrg,
          gitHubOrgName: course.gitHubOrgName ?? '',
          repoNameFilter: course.repoNameFilter ?? '',
          installationId: course.installationId?.toString() ?? '',
          isOn: course.aiInsights?.isOn ?? true,
          customisedAI: !!(
            course.aiInsights?.provider || course.aiInsights?.model
          ),
          provider: course.aiInsights?.provider ?? '',
          model: course.aiInsights?.model ?? '',
          apiKey: course.aiInsights?.apiKey ?? '',
          frequency: course.aiInsights?.frequency ?? '',
          aiStartDate: course.aiInsights?.startDate
            ? new Date(course.aiInsights.startDate)
            : null,
        });
        const lastStep = course.draftStep ?? -1;
        setStep(Math.min(lastStep + 1, TOTAL_STEPS - 1));
        if (course.installationId) {
          setAppInstallationStatus(InstallationStatus.SUCCESS);
        }
      } catch (e) {
        console.error('Error loading draft:', e);
      }
    };
    loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.courseId]);

  const saveCurrentStep = async (publish = false) => {
    const session = await getSession();
    const accountId = session?.user?.id;
    if (!accountId) return;

    const body: any = {};
    // Build partial payload depending on `step`
    if (step === 0) {
      const v = form.values;
      Object.assign(body, {
        name: v.name,
        code: v.code,
        semester: v.semester,
        startDate: v.startDate,
        duration: v.duration,
        courseType: v.courseType,
        status: 'draft',
        draftStep: 0,
      });
    } else if (step === 3) {
      const v = form.values;
      Object.assign(body, {
        courseType: v.courseType,
        gitHubOrgName:
          v.courseType === CourseType.GitHubOrg ? v.gitHubOrgName : undefined,
        repoNameFilter:
          v.courseType === CourseType.GitHubOrg ? v.repoNameFilter : undefined,
        installationId: v.installationId ? Number(v.installationId) : undefined,
        draftStep: 3,
      });
    } else if (step === 4) {
      const v = form.values;
      Object.assign(body, {
        status: 'draft',
        draftStep: 4,
        aiInsights: {
          isOn: v.isOn,
          provider: v.customisedAI ? v.provider : undefined,
          model: v.customisedAI ? v.model : undefined,
          apiKey: v.customisedAI ? v.apiKey : undefined,
          frequency: v.frequency || undefined,
          startDate: v.aiStartDate ?? undefined,
        },
      });
    } else if (step === 5) {
      Object.assign(body, {
        status: publish ? 'active' : 'draft',
        draftStep: 5,
      });
    } else {
      body.draftStep = step;
    }

    setLoading(true);
    try {
      if (!courseId) {
        // first save: create draft
        const res = await fetch(apiRoute, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `${accountId}`,
          },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create course');
        setCourseId(data._id);
        if (publish) router.push(`/courses/${data._id}?new=true`);
      } else {
        // subsequent saves: update
        const res = await fetch(`${apiRoute}/${courseId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `${accountId}`,
          },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update course');
        if (publish) router.push(`/courses/${courseId}?new=true`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (!validateCurrentStep()) return;

    await saveCurrentStep(false);
    setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const handleSave = async () => {
    // save draft without changing step
    await saveCurrentStep(false);
  };

  const handlePublish = async () => {
    // on last step: save + publish
    await saveCurrentStep(true);
  };

  const handleCancel = () => {
    router.push('/courses');
  };

  return (
    <Box
      p="lg"
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        alignItems: 'center',
      }}
    >
      <Box
        style={{
          fontSize: '1.5rem',
          width: '100%',
          maxWidth: 1200,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Title
          order={1}
          mb="xl"
          style={{ fontSize: '3rem', textAlign: 'center' }}
        >
          Create Course
        </Title>

        {/* Status bar */}
        <Stepper
          active={step}
          onStepClick={setStep}
          allowNextStepsSelect={false}
          size="md"
          color="blue"
          completedIcon={<IconCheck size={16} />}
          styles={{
            steps: { gap: 4 },
            separator: { flexGrow: 1 },
            step: {
              flexDirection: 'column',
            },
            stepBody: {
              marginTop: 8,
              marginLeft: 0,
            },
            stepIcon: {
              margin: 0,
            },
          }}
        >
          <Stepper.Step
            label={
              <Group gap={6} align="center" justify="center">
                <IconListDetails size={16} />
                <Text size="md">Course Details</Text>
              </Group>
            }
          />
          <Stepper.Step
            label={
              <Group gap={6} align="center" justify="center">
                <IconUsers size={16} />
                <Text size="md">People</Text>
              </Group>
            }
          />
          <Stepper.Step
            label={
              <Group gap={6} align="center" justify="center">
                <IconHierarchy2 size={16} />
                <Text size="md">Teams</Text>
              </Group>
            }
          />
          <Stepper.Step
            label={
              <Group gap={6} align="center" justify="center">
                <IconGitBranch size={16} />
                <Text size="md">Repositories</Text>
              </Group>
            }
          />
          <Stepper.Step
            label={
              <Group gap={6} align="center" justify="center">
                <IconRobot size={16} />
                <Text size="md">AI Insights</Text>
              </Group>
            }
          />
          <Stepper.Step
            label={
              <Group gap={6} align="center" justify="center">
                <IconFlag size={16} />
                <Text size="md">Finish</Text>
              </Group>
            }
          />
        </Stepper>

        {/* Step content */}
        <Box
          mt="xl"
          style={{
            flex: 1,
            width: '100%',
            maxWidth: 800,
            display: 'flex',
            flexDirection: 'column',
            padding: '20px 96px',
            margin: '0 auto',
          }}
        >
          {/* Step 0: Course details */}
          {step === 0 && (
            <>
              <Title order={3} mt="md" mb="xs" style={{ fontSize: '2rem' }}>
                Course Details
              </Title>
              <Text size="sm" c="dimmed" mb="md">
                Please provide essential information to begin setting up your
                course.
              </Text>

              <TextInput
                withAsterisk
                label="Course Name"
                placeholder="Software Engineering Project"
                {...form.getInputProps('name')}
                value={form.values.name}
                onChange={e =>
                  form.setFieldValue('name', e.currentTarget.value)
                }
              />

              <Group mt="md" grow gap="md" align="flex-start">
                <TextInput
                  withAsterisk
                  label="Course Code"
                  placeholder="CS3203"
                  {...form.getInputProps('code')}
                  value={form.values.code}
                  onChange={e =>
                    form.setFieldValue('code', e.currentTarget.value)
                  }
                />
                <TextInput
                  withAsterisk
                  label="Academic Term"
                  placeholder="AY2025/2026 Semester 1"
                  {...form.getInputProps('semester')}
                  value={form.values.semester}
                  onChange={e =>
                    form.setFieldValue('semester', e.currentTarget.value)
                  }
                />
              </Group>

              <Group mt="md" grow gap="md" align="flex-start">
                <DatePickerInput
                  withAsterisk
                  label="Start Date"
                  placeholder="Pick start date"
                  error={form.errors.startDate}
                  value={form.values.startDate}
                  onChange={value => form.setFieldValue('startDate', value)}
                />
                <TextInput
                  withAsterisk
                  label="Duration"
                  placeholder="13"
                  rightSection={
                    <Text style={{ paddingRight: 30 }}> weeks </Text>
                  }
                  {...form.getInputProps('duration')}
                  value={form.values.duration}
                  onChange={e =>
                    form.setFieldValue(
                      'duration',
                      Number(e.currentTarget.value) || 0
                    )
                  }
                />
              </Group>
            </>
          )}

          {/* Step 1: People */}
          {step === 1 && (
            <>
              <Title order={4} mt="md" mb="xs">
                People
              </Title>
              <Text size="sm" c="dimmed" mb="md">
                Upload faculty, teaching assistants (TAs) and student
                information. You can add people after the course is created from
                the course People page.
              </Text>
              <Text size="sm" c="dimmed">
                No configuration required in this step. Click Next to continue.
              </Text>
            </>
          )}

          {/* Step 2: Team allocation */}
          {step === 2 && (
            <>
              <Title order={4} mt="md" mb="xs">
                Team Allocation
              </Title>
              <Text size="sm" c="dimmed" mb="md">
                Allocate students and TAs to teams. You can configure teams
                after the course is created from the course Teams page.
              </Text>
              <Text size="sm" c="dimmed">
                No configuration required in this step. Click Next to continue.
              </Text>
            </>
          )}

          {/* Step 3: Repositories */}
          {step === 3 && (
            <>
              <Title order={4} mt="md" mb="xs">
                Repositories
              </Title>
              <Text size="sm" c="dimmed" mb="md">
                Choose how course repositories are synced.
              </Text>
              <Box>
                <Group gap={6}>
                  <Title order={6} my={5}>
                    Repository Source
                  </Title>
                  <Tooltip
                    label="Choose how course repositories are synced: Manual Setup via public GitHub links, or automatically through GitHub Organisation."
                    withinPortal
                    multiline
                    w={300}
                  >
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      aria-label="Setup Repositories help"
                    >
                      <IconHelpCircle size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <SegmentedControl
                    data={[
                      {
                        value: CourseType.GitHubOrg,
                        label: 'GitHub Organisation',
                      },
                      { value: CourseType.Normal, label: 'Manual Setup' },
                    ]}
                    {...form.getInputProps('courseType')}
                  />
                </Group>
                <Collapse in={form.values.courseType === CourseType.GitHubOrg}>
                  <Box>
                    <Title order={6} my={10}>
                      GitHub Organisation Setup
                    </Title>
                    <Card withBorder p="md">
                      <Text size="sm" c="dimmed" maw={520} mb="sm">
                        Install the CRISP GitHub App in your GitHub organisation
                        to enable automatic syncing of repositories.
                      </Text>
                      <Button
                        w={CARD_W}
                        leftSection={<IconBrandGithub size={14} />}
                        variant="default"
                        component="a"
                        href={gitHubNewInstallationUrl}
                        target="_blank"
                      >
                        Install CRISP GitHub
                      </Button>
                      <TextInput
                        withAsterisk
                        placeholder="e.g. nus-crisp"
                        label="GitHub Organisation Name"
                        {...form.getInputProps('gitHubOrgName')}
                        my={5}
                        onChange={e => {
                          form.setFieldValue(
                            'gitHubOrgName',
                            e.currentTarget.value
                          );
                          form.setFieldValue('installationId', '');
                          setAppInstallationStatus(InstallationStatus.IDLE);
                          setErrorMessage('');
                        }}
                      />
                      <Space h="sm" />
                      {errorMessage && (
                        <Text style={{ maxWidth: CARD_W }} c="red">
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
                          : 'Verify CRISP Installation'}
                      </Button>
                      <Collapse
                        in={
                          appInstallationStatus === InstallationStatus.SUCCESS
                        }
                        mt="md"
                      >
                        <TextInput
                          withAsterisk
                          label="Repo Name Filter"
                          placeholder="e.g. 23s2"
                          {...form.getInputProps('repoNameFilter')}
                          onChange={e =>
                            form.setFieldValue(
                              'repoNameFilter',
                              e.currentTarget.value
                            )
                          }
                        />
                      </Collapse>
                    </Card>
                  </Box>
                </Collapse>
              </Box>
            </>
          )}

          {/* Step 4: AI Insights */}
          {step === 4 && (
            <>
              <Title order={4} mt="md" mb="xs">
                AI Insights
              </Title>
              <Text size="sm" c="dimmed" mb="md">
                Configure model and frequency of AI generated insights on
                teams&apos; codebase.
              </Text>
              <Box>
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
                            value === 'Every 4 weeks (~Monthly)'
                              ? 'Monthly'
                              : value || ''
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
                        minDate={
                          new Date(new Date().setDate(new Date().getDate() + 1))
                        }
                        onChange={value =>
                          form.setFieldValue('aiStartDate', value)
                        }
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
              </Box>
            </>
          )}

          {/* Step 5: Review & confirm */}
          {step === 5 && (
            <>
              <Title order={4} mt="md" mb="xs">
                Review &amp; Confirm
              </Title>
              <Text size="sm" c="dimmed" mb="md">
                Review your course configuration before creating it.
              </Text>

              <Group align="flex-start" grow>
                <Card withBorder padding="md">
                  <Title order={5} mb="xs">
                    Course Details
                  </Title>
                  <Text size="sm">
                    <strong>Name: </strong>
                    {form.values.name || '-'}
                  </Text>
                  <Text size="sm">
                    <strong>Code: </strong>
                    {form.values.code || '-'}
                  </Text>
                  <Text size="sm">
                    <strong>Term: </strong>
                    {form.values.semester || '-'}
                  </Text>
                  <Text size="sm">
                    <strong>Start Date: </strong>
                    {form.values.startDate?.toLocaleDateString() || '-'}
                  </Text>
                  <Text size="sm">
                    <strong>Duration: </strong>
                    {form.values.duration} weeks
                  </Text>
                </Card>

                <Card withBorder padding="md">
                  <Title order={5} mb="xs">
                    Repositories
                  </Title>
                  <Text size="sm">
                    <strong>Source: </strong>
                    {form.values.courseType === CourseType.GitHubOrg
                      ? 'GitHub Organisation'
                      : 'Manual Setup'}
                  </Text>
                  {form.values.courseType === CourseType.GitHubOrg && (
                    <>
                      <Text size="sm">
                        <strong>Organisation: </strong>
                        {form.values.gitHubOrgName || '-'}
                      </Text>
                      <Text size="sm">
                        <strong>Repo filter: </strong>
                        {form.values.repoNameFilter || '-'}
                      </Text>
                    </>
                  )}
                </Card>
              </Group>

              <Card withBorder padding="md" mt="md">
                <Title order={5} mb="xs">
                  AI Insights
                </Title>
                <Text size="sm">
                  <strong>Enabled: </strong>
                  {form.values.isOn ? 'Yes' : 'No'}
                </Text>
                {form.values.isOn && (
                  <>
                    <Text size="sm">
                      <strong>Frequency: </strong>
                      {form.values.frequency || '-'}
                    </Text>
                    <Text size="sm">
                      <strong>Start Date: </strong>
                      {form.values.aiStartDate?.toLocaleDateString() || '-'}
                    </Text>
                    <Text size="sm">
                      <strong>Custom model: </strong>
                      {form.values.customisedAI ? 'Yes' : 'No'}
                    </Text>
                    {form.values.customisedAI && (
                      <>
                        <Text size="sm">
                          <strong>Provider: </strong>
                          {form.values.provider || '-'}
                        </Text>
                        <Text size="sm">
                          <strong>Model: </strong>
                          {form.values.model || '-'}
                        </Text>
                      </>
                    )}
                  </>
                )}
              </Card>
            </>
          )}
        </Box>

        {/* Bottom actions - fixed footer */}
        <Box
          component="footer"
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '12px 24px',
            background:
              'linear-gradient(to top, var(--mantine-color-body), transparent)',
            backdropFilter: 'blur(6px)',
            borderTop:
              '1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))',
            zIndex: 20,
          }}
        >
          <Group
            justify="space-between"
            style={{ maxWidth: 1200, margin: '0 auto' }}
          >
            <Group>
              <Button
                size="xl"
                variant="default"
                onClick={() => setStep(s => Math.max(s - 1, 0))}
                disabled={loading || step === 0}
              >
                Back
              </Button>
              <Button
                size="xl"
                variant="default"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            </Group>
            <Group>
              <Button
                size="xl"
                variant="outline"
                onClick={handleSave}
                loading={loading}
              >
                Save
              </Button>
              <Button
                size="xl"
                onClick={step === TOTAL_STEPS - 1 ? handlePublish : handleNext}
                loading={loading}
              >
                {step === TOTAL_STEPS - 1 ? 'Confirm & Create' : 'Next'}
              </Button>
            </Group>
          </Group>
        </Box>
      </Box>
    </Box>
  );
};

export default CreateCoursePage;
