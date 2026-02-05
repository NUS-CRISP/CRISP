import { Group, Text, TextInput, Title } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { UseFormReturnType } from '@mantine/form';
import { CreateCourseFormValues } from '@/components/course-create/types';

interface Props {
  form: UseFormReturnType<CreateCourseFormValues>;
}

export const CourseDetailsSetup = ({ form }: Props) => {
  return (
    <>
      <Title order={3} mt="md" mb="xs">
        Course Details
      </Title>
      <Text size="sm" c="dimmed" mb="md">
        Please provide essential information to begin setting up your course.
      </Text>

      <TextInput
        withAsterisk
        label="Course Name"
        placeholder="Software Engineering Project"
        {...form.getInputProps('name')}
        value={form.values.name}
        onChange={e => form.setFieldValue('name', e.currentTarget.value)}
      />

      <Group mt="md" grow gap="md" align="flex-start">
        <TextInput
          withAsterisk
          label="Course Code"
          placeholder="CS3203"
          {...form.getInputProps('code')}
          value={form.values.code}
          onChange={e => form.setFieldValue('code', e.currentTarget.value)}
        />
        <TextInput
          withAsterisk
          label="Academic Term"
          placeholder="AY2025/2026 Semester 1"
          {...form.getInputProps('semester')}
          value={form.values.semester}
          onChange={e => form.setFieldValue('semester', e.currentTarget.value)}
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
          rightSection={<Text style={{ paddingRight: 30 }}> weeks </Text>}
          {...form.getInputProps('duration')}
          value={form.values.duration}
          onChange={e =>
            form.setFieldValue('duration', Number(e.currentTarget.value) || 0)
          }
        />
      </Group>
    </>
  );
};
