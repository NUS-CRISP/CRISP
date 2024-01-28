import apiBaseUrl from '@/lib/api-config';
import {
  Box,
  Button,
  Card,
  Collapse,
  List,
  SegmentedControl,
  Space,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { CourseType } from '@shared/types/Course';
import { IconBrandGithub, IconCheck } from '@tabler/icons-react';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState } from 'react';

const CARD_W = '210px';
// TODO: Setup webhook receiver to automatically get the org name where user installed GH app

const CreateCoursePage: React.FC = () => {
  const router = useRouter();

  enum InstallationStatus {
    IDLE = 'idle',
    LOADING = 'loading',
    SUCCESS = 'success',
    ERROR = 'error',
  }
  const [AppInstallationStatus, setAppInstallationStatus] = useState<InstallationStatus>(InstallationStatus.IDLE);

  const [errorMessage, setErrorMessage] = useState('');
  const courseApiUrl = apiBaseUrl + '/courses';

  const form = useForm({
    initialValues: {
      name: '',
      code: '',
      semester: '',
      courseType: CourseType.Normal,
      gitHubOrgName: '',
      installationId: '',
    },
    validate: {
      name: value =>
        value.trim().length > 0 ? null : 'Course name is required',
      code: value =>
        value.trim().length > 0 ? null : 'Course code is required',
      semester: value =>
        value.trim().length > 0 ? null : 'Semester is required',
      courseType: value => (value ? null : 'Course type is required'),
      // field should be valid only if courseType is Normal, or if courseType is GitHubOrg and installation check is successful
      gitHubOrgName: (value, values) =>
        values.courseType === CourseType.Normal ||
        (values.courseType === CourseType.GitHubOrg &&
          AppInstallationStatus === InstallationStatus.SUCCESS)
          ? null
          : 'GitHub Org name is required',
    },
  });

  const checkAppInstallation = async (orgName: string) => {
    setAppInstallationStatus(InstallationStatus.LOADING);
    setErrorMessage('');

    try {
      const githubInstallationApiUrl =
        apiBaseUrl + '/github/check-installation';

      const response = await fetch(githubInstallationApiUrl, {
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
      setAppInstallationStatus(InstallationStatus.ERROR);
      setErrorMessage('Failed to connect to the server');
    }
  };

  const handleSubmit = async () => {
    const session = await getSession();
    const accountId = session?.user?.id;
    const response = await fetch(courseApiUrl, {
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
    console.log('Course created:', data);
    router.push(`/courses/${data._id}?new=true`);
  };

  return (
    <Box maw={300} mx="auto">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput
          withAsterisk
          label="Course Name"
          {...form.getInputProps('name')}
          value={form.values.name}
          onChange={event =>
            form.setFieldValue('name', event.currentTarget.value)
          }
        />
        <TextInput
          withAsterisk
          label="Course Code"
          {...form.getInputProps('code')}
          value={form.values.code}
          onChange={event =>
            form.setFieldValue('code', event.currentTarget.value)
          }
        />
        <TextInput
          withAsterisk
          label="Semester"
          {...form.getInputProps('semester')}
          value={form.values.semester}
          onChange={event =>
            form.setFieldValue('semester', event.currentTarget.value)
          }
        />
        <Space h="md" />
        <Box>
          <SegmentedControl
            data={[
              { value: CourseType.Normal, label: 'Normal' },
              { value: CourseType.GitHubOrg, label: 'GitHub Org' },
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
                      href="https://github.com/apps/NUS-CRISP/installations/new"
                      target="_blank"
                    >
                      Install our GitHub App
                    </Button>
                  </List.Item>
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
                      loading={AppInstallationStatus === InstallationStatus.LOADING}
                      variant={
                        AppInstallationStatus === InstallationStatus.SUCCESS ? 'filled' : 'outline'
                      }
                      color={
                        AppInstallationStatus === InstallationStatus.SUCCESS
                          ? 'green'
                          : AppInstallationStatus === InstallationStatus.ERROR
                          ? 'red'
                          : 'blue'
                      }
                      rightSection={
                        AppInstallationStatus === InstallationStatus.SUCCESS ? (
                          <IconCheck size={14} />
                        ) : null
                      }
                      onClick={() =>
                        checkAppInstallation(form.values.gitHubOrgName)
                      }
                    >
                      {AppInstallationStatus === InstallationStatus.SUCCESS
                        ? 'Installed'
                        : AppInstallationStatus === InstallationStatus.ERROR
                        ? 'Try Again'
                        : AppInstallationStatus === InstallationStatus.LOADING
                        ? 'Checking...'
                        : 'Check Installation'}
                    </Button>
                  </List.Item>
                </List>
              </Card>
            </Box>
          </Collapse>
        </Box>
        <Space h="md" />
        <Button type="submit">Create Course</Button>
      </form>
    </Box>
  );
};

export default CreateCoursePage;
