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

const CreateCoursePage: React.FC = () => {
  const form = useForm({
    initialValues: {
      name: '',
      code: '',
      semester: '',
      courseType: CourseType.Normal,
    },
  });

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
            // value={form.values.courseType}
            // onChange={value =>
            //   form.setFieldValue('courseType', value as CourseType)
            // }
            {...form.getInputProps('courseType')}
          />

          <Collapse in={form.values.courseType === CourseType.GitHubOrg}>
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
