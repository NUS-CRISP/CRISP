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
  Title
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { CourseType } from '@shared/types/Course';
import { IconBrandGithub, IconCheck } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { useState } from 'react';

const CARD_W = '210px';
// TODO: Setup webhook receiver to automatically get the org name where user installed GH app

const CreateCoursePage: React.FC = () => {
  const router = useRouter();
  const [appInstalled, setAppInstalled] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');

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
            appInstalled === 'success')
          ? null
          : 'GitHub Org name is required',
    },
  });

  const checkAppInstallation = async (orgName: string) => {
    setAppInstalled('loading');
    setErrorMessage('');

    try {
      const response = await fetch(`http://localhost:${process.env.NEXT_PUBLIC_BACKEND_PORT}/api/github/check-installation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orgName }),
      });

      if (response.ok) {
        const { installationId } = await response.json();
        form.setFieldValue('installationId', installationId);
        setAppInstalled('success');
      } else {
        setAppInstalled('error');
        const errorData = await response.json();
        setErrorMessage(errorData.message || 'An error occurred');
      }
    } catch (error) {
      setAppInstalled('error');
      setErrorMessage('Failed to connect to the server');
    }
  };


  const handleSubmit = async () => {
    const response = await fetch(
      `http://localhost:${process.env.NEXT_PUBLIC_BACKEND_PORT}/api/courses`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form.values),
      }
    );

    const data = await response.json();

    if (response.ok) {
      console.log('Course created:', data);
      router.push(`/courses/${data._id}?new=true`);
    } else {
      console.error('Error creating course:', data);
    }
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
                        setAppInstalled('idle');
                        setErrorMessage('');
                      }}
                    />
                    <Space h="sm" />
                    {errorMessage && (
                      <Text style={{
                        maxWidth: CARD_W
                      }}
                        c="red" >
                        {errorMessage}
                      </Text>
                    )}
                    <Button
                      type='button'
                      loading={appInstalled === 'loading'}
                      variant={appInstalled === 'success' ? 'filled' : 'outline'}
                      color={
                        appInstalled === 'success'
                          ? 'green'
                          : appInstalled === 'error'
                            ? 'red'
                            : 'blue'
                      }
                      rightSection={
                        appInstalled === 'success' ? (
                          <IconCheck size={14} />
                        ) : null
                      }
                      onClick={() =>
                        checkAppInstallation(form.values.gitHubOrgName)
                      }
                    >
                      {appInstalled === 'success'
                        ? 'Installed'
                        : appInstalled === 'error'
                          ? 'Try Again'
                          : appInstalled === 'loading'
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
