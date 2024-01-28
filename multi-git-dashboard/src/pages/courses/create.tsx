import apiBaseUrl from '@/lib/api-config';
import {
  Badge,
  Box,
  Button,
  Card,
  CloseButton,
  Collapse,
  List,
  MultiSelect,
  SegmentedControl,
  Space,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { CourseType } from '@shared/types/Course';
import { TeamData } from '@shared/types/TeamData';
import { IconBrandGithub, IconCheck } from '@tabler/icons-react';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState } from 'react';

const CARD_W = '210px';
// TODO: Setup webhook receiver to automatically get the org name where user installed GH app

const CreateCoursePage: React.FC = () => {
  const router = useRouter();
  const courseApiUrl = apiBaseUrl + '/courses';

  const [appInstalled, setAppInstalled] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [repoList, setRepoList] = useState([] as string[]);
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
      // Check if the app is installed on the org
      const response = await fetch(`${apiBaseUrl}/github/check-installation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orgName }),
      });

      if (!response.ok) {
        setAppInstalled('error');
        const errorData = await response.json();
        setErrorMessage(errorData.message || 'An error occurred');
        return;
      }
      const { installationId } = await response.json();
      form.setFieldValue('installationId', installationId);

      // Fetch the list of repositories
      const reposResponse = await fetch(`${apiBaseUrl}/teamdatas/${orgName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orgName }),
      });

      if (!reposResponse.ok) {
        throw new Error('Failed to fetch repositories');
      }

      // response is an array of team data objects
      const teamDatas: TeamData[] = await reposResponse.json();
      setRepoList(teamDatas.map(teamData => teamData.repoName));

      setAppInstalled('success');
    } catch (error) {
      setAppInstalled('error');
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
                  <Collapse in={appInstalled !== 'success'} mt="md">
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
                        loading={appInstalled === 'loading'}
                        variant={
                          appInstalled === 'success' ? 'filled' : 'outline'
                        }
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
                        {appInstalled === 'error'
                          ? 'Try Again'
                          : 'Check Installation'}
                      </Button>
                    </List.Item>
                  </Collapse>
                  <Collapse in={appInstalled === 'success'} mt="md">
                    <List.Item>
                      <Badge
                        variant="outline"
                        color="green"
                        size="lg"
                        rightSection={
                          <CloseButton
                            style={{ color: '#40c057' }} // open-color, green 6
                            onClick={() => {
                              setAppInstalled('idle');
                              setErrorMessage('');
                              form.setFieldValue('gitHubOrgName', '');
                            }}
                            size={14}
                          />
                        }
                      >
                        {form.values.gitHubOrgName}
                      </Badge>
                      <MultiSelect
                        mt="sm"
                        label="Repositories"
                        placeholder="Pick repos..."
                        data={repoList} // TODO: list repos from org
                        hidePickedOptions
                        searchable
                      />
                    </List.Item>
                  </Collapse>
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
