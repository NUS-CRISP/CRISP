import {
  Box,
  Button,
  Collapse,
  List,
  SegmentedControl,
  Space,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { CourseType } from '@shared/types/Course';
import { IconBrandGithub } from '@tabler/icons-react';
import { useState } from 'react';
import { useRouter } from 'next/router';

interface CourseFormProps {}

const CreateCoursePage: React.FC<CourseFormProps> = () => {
  const router = useRouter();
  const form = useForm({
    initialValues: {
      name: '',
      code: '',
      semester: '',
    },
  });

  const [courseType, setCourseType] = useState<CourseType>(CourseType.Normal);

  const handleSubmit = async () => {
    const response = await fetch(
      `http://localhost:${process.env.NEXT_PUBLIC_BACKEND_PORT}/api/courses`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form.values,
          courseType: courseType,
        }),
      }
    );
    if (response.ok) {
      const data = await response.json();
      console.log('Course created:', data);
      router.push('/courses');
    } else {
      console.log('Error creating course:', response);
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
          onChange={event => {
            form.setFieldValue('name', event.currentTarget.value);
          }}
        />
        <TextInput
          withAsterisk
          label="Course Code"
          {...form.getInputProps('code')}
          value={form.values.code}
          onChange={event => {
            form.setFieldValue('code', event.currentTarget.value);
          }}
        />
        <TextInput
          withAsterisk
          label="Semester"
          {...form.getInputProps('semester')}
          value={form.values.semester}
          onChange={event => {
            form.setFieldValue('semester', event.currentTarget.value);
          }}
        />
        <Space h="md" />
        <Box>
          <SegmentedControl
            data={[
              { label: 'Normal', value: CourseType.Normal },
              { label: 'GitHub Organisation', value: CourseType.GitHubOrg },
            ]}
            value={courseType}
            onChange={value => setCourseType(value as CourseType)}
          />

          <Collapse in={courseType === CourseType.GitHubOrg}>
            <Box>
              <Title order={4} my={15}>
                GitHub Org Integration Setup:
              </Title>
              <List>
                <List.Item>
                  <Button
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
                  Ensure you have granted the necessary permissions.
                </List.Item>
              </List>
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
