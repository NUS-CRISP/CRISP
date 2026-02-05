import { Box, Button, Group, Stepper, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import { useState } from 'react';
import { CourseType } from '@shared/types/Course';
// import the existing field sections from CreateCourseForm or inline them

const TOTAL_STEPS = 5;

const CreateCoursePage = () => {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm({
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
    // reuse your existing validate config
  });

  const apiRoute = '/api/courses';

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
        status: publish ? 'active' : 'draft',
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
    // step-specific validation here
    const hasErrors = false; // plug in validateField per step
    if (hasErrors) return;

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
      }}
    >
      <Title order={2} mb="md">
        Create Course
      </Title>

      {/* Status bar */}
      <Stepper active={step} onStepClick={setStep} allowNextStepsSelect={false}>
        <Stepper.Step label="Course Details" />
        <Stepper.Step label="People" />
        <Stepper.Step label="Team Allocation" />
        <Stepper.Step label="Repositories" />
        <Stepper.Step label="AI Insights" />
      </Stepper>

      {/* Step content – reuse pieces from CreateCourseForm here */}
      <Box
        mt="xl"
        style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* render fields conditionally by `step` */}
      </Box>

      {/* Bottom actions */}
      <Group justify="space-between" mt="xl">
        <Button variant="default" onClick={handleCancel} disabled={loading}>
          Cancel
        </Button>
        <Group>
          <Button variant="outline" onClick={handleSave} loading={loading}>
            Save
          </Button>
          <Button
            onClick={step === TOTAL_STEPS - 1 ? handlePublish : handleNext}
            loading={loading}
          >
            {step === TOTAL_STEPS - 1 ? 'Create Course' : 'Next'}
          </Button>
        </Group>
      </Group>
    </Box>
  );
};

export default CreateCoursePage;
