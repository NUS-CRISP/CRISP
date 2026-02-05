import { Box, Button, Group, Text, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { CourseType } from '@shared/types/Course';

import { CourseDetailsSetup } from '@/components/create-course/CourseDetailsSetup';
import { CourseReposSetup } from '@/components/create-course/CourseReposSetup';
import type { CreateCourseFormValues } from '@/components/create-course/types';
import { CourseAISetup } from '@/components/create-course/CourseAISetup';
import { CourseReviewSummary } from '@/components/create-course/CourseReviewSummary';
import ProgressBar from '@/components/create-course/ProgressBar';

enum InstallationStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
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
    } else if (step === TOTAL_STEPS - 1) {
      if (publish) {
        Object.assign(body, {
          status: 'active',
        });
      } else {
        Object.assign(body, {
          status: 'draft',
          draftStep: 5,
        });
      }
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

        <ProgressBar step={step} setStep={setStep} />

        {/* Get respective step content */}
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
          {step === 0 && <CourseDetailsSetup form={form} />}

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
            <CourseReposSetup
              form={form}
              appInstallationStatus={
                appInstallationStatus === InstallationStatus.LOADING
                  ? 'loading'
                  : appInstallationStatus === InstallationStatus.SUCCESS
                    ? 'success'
                    : appInstallationStatus === InstallationStatus.ERROR
                      ? 'error'
                      : 'idle'
              }
              errorMessage={errorMessage}
              onOrgNameChange={value => {
                form.setFieldValue('gitHubOrgName', value);
                form.setFieldValue('installationId', '');
                setAppInstallationStatus(InstallationStatus.IDLE);
                setErrorMessage('');
              }}
              onVerifyClick={() =>
                checkAppInstallation(form.values.gitHubOrgName)
              }
            />
          )}

          {/* Step 4: AI Insights */}
          {step === 4 && (
            <CourseAISetup form={form} modelOptions={modelOptions} />
          )}

          {/* Step 5: Review & confirm */}
          {step === 5 && <CourseReviewSummary form={form} />}
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
            <Button
              size="xl"
              onClick={step === TOTAL_STEPS - 1 ? handlePublish : handleNext}
              loading={loading}
            >
              {step === TOTAL_STEPS - 1
                ? 'Confirm & Create'
                : 'Save & Continue'}
            </Button>
          </Group>
        </Box>
      </Box>
    </Box>
  );
};

export default CreateCoursePage;
